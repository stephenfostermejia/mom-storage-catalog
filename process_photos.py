#!/usr/bin/env python3
"""
Household Archive Catalog - Photo Processing Script
Version: 1.0.0

This script processes batches of household item photos and generates
catalog entries with OCR, descriptions, and metadata.
"""

import os
import json
import hashlib
import shutil
from datetime import datetime
from pathlib import Path
from PIL import Image
import anthropic

# Configuration
CATALOG_DIR = Path(__file__).parent
DATA_DIR = CATALOG_DIR / "data"
IMG_DIR = CATALOG_DIR / "img"
ARCHIVE_DIR = CATALOG_DIR / "archive"
UPDATES_DIR = DATA_DIR / "updates"

BASE_JSON = DATA_DIR / "items.base.json"
UPDATES_INDEX = DATA_DIR / "updates_index.json"
BOX_KEY = DATA_DIR / "box_key.json"

THUMBNAIL_MAX_SIZE = (512, 512)

# Box category mappings
BOX_CATEGORIES = {
    "DO": "Documents",
    "KN": "Knickknacks",
    "OS": "Office Supplies",
    "CL": "Clothing",
    "KT": "Kitchen Items",
    "BK": "Books",
    "EL": "Electronics",
    "TO": "Tools",
    "ME": "Memorabilia",
    "DC": "Decor Items",
    "TR": "Toys",
    "PI": "Pictures",
    "AN": "Antiques",
    "GE": "Genealogy Files",
    "MG": "Magazines/Newspapers"
}

LOCATIONS = {
    "L": "Living Room",
    "M": "Mom's Room",
    "G1": "Guest Room 1",
    "G2": "Guest Room 2",
    "S": "Storage Room"
}


class CatalogProcessor:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            print("Warning: No Anthropic API key found. Set ANTHROPIC_API_KEY environment variable.")
            print("OCR and AI descriptions will not be available.")
        else:
            self.client = anthropic.Anthropic(api_key=self.api_key)

        self.catalog_data = self.load_catalog()
        self.existing_hashes = self.build_hash_index()
        self.new_items = []
        self.updated_items = []
        self.item_counter = self.get_next_item_id()

    def load_catalog(self):
        """Load existing catalog data"""
        if BASE_JSON.exists():
            with open(BASE_JSON, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            "catalog_version": datetime.now().strftime("%Y.%m.%d.%H%M"),
            "source": "Stephen Household Archive",
            "items": []
        }

    def build_hash_index(self):
        """Build index of existing image hashes"""
        hashes = {}
        for item in self.catalog_data.get("items", []):
            if item.get("hashes", {}).get("sha1"):
                hashes[item["hashes"]["sha1"]] = item["id"]
        return hashes

    def get_next_item_id(self):
        """Get next available item ID"""
        existing_items = self.catalog_data.get("items", [])
        if not existing_items:
            return 1

        max_id = 0
        for item in existing_items:
            item_id = item.get("id", "")
            if item_id.startswith("it_"):
                try:
                    num = int(item_id.split("_")[-1])
                    max_id = max(max_id, num)
                except ValueError:
                    pass

        return max_id + 1

    def calculate_sha1(self, file_path):
        """Calculate SHA1 hash of file"""
        sha1 = hashlib.sha1()
        with open(file_path, 'rb') as f:
            while True:
                data = f.read(65536)
                if not data:
                    break
                sha1.update(data)
        return sha1.hexdigest()

    def create_thumbnail(self, image_path, thumb_path):
        """Create thumbnail for image"""
        try:
            with Image.open(image_path) as img:
                img.thumbnail(THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
                img.save(thumb_path, quality=85, optimize=True)
            return True
        except Exception as e:
            print(f"Error creating thumbnail for {image_path}: {e}")
            return False

    def encode_image(self, image_path):
        """Encode image to base64 for API"""
        import base64
        with open(image_path, "rb") as f:
            return base64.standard_b64encode(f.read()).decode("utf-8")

    def analyze_image_with_ai(self, image_path, family_names=None):
        """Use Claude Vision to analyze image and extract information"""
        if not self.api_key:
            return self.create_fallback_item(image_path)

        try:
            image_data = self.encode_image(image_path)

            # Determine media type
            ext = Path(image_path).suffix.lower()
            media_type = "image/jpeg" if ext in ['.jpg', '.jpeg'] else "image/png"

            family_names_text = ""
            if family_names:
                family_names_text = f"\n\nFamily names to watch for: {', '.join(family_names)}"

            prompt = f"""Analyze this household archive item photo and extract the following information:

1. **Box ID Label**: Look for any label/sticker showing a box code (format: CC##[Location], e.g., DO3M, KT2L)
   - CC = 2-letter category code
   - ## = box number
   - [Location] = optional location code (L, M, G1, G2, S)

2. **Items visible**: List all distinct items you can see in this photo

3. **For each item**, provide:
   - Item name (short, clear)
   - Detailed description (museum-quality, family-archive tone)
   - Category (use format: MainCategory > SubCategory)
   - Any visible text (OCR)
   - Estimated quantity
   - Any people mentioned in documents/photos
   - Suggested tags
   - Conservation notes if applicable

4. **If this is a publication** (newspaper, magazine):
   - Publication name
   - Date of issue (if visible)
   - Page number
   - Names mentioned{family_names_text}

Respond in JSON format:
{{
  "box_id": "detected box ID or null",
  "box_id_confidence": "high/medium/low",
  "items": [
    {{
      "item_name": "...",
      "category": "...",
      "description": "...",
      "quantity": 1,
      "notes": "...",
      "captions": ["..."],
      "people": ["..."],
      "tags": ["..."],
      "pub": {{
        "publication_name": "...",
        "date_of_issue": "...",
        "page_number": "...",
        "names_mentioned": ["..."]
      }} or null,
      "ocr_text": "any visible text"
    }}
  ]
}}"""

            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data,
                                },
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ],
                    }
                ],
            )

            # Extract JSON from response
            response_text = message.content[0].text

            # Try to find JSON in response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                return json.loads(json_str)
            else:
                print(f"Could not parse AI response as JSON: {response_text}")
                return self.create_fallback_item(image_path)

        except Exception as e:
            print(f"Error analyzing image with AI: {e}")
            return self.create_fallback_item(image_path)

    def create_fallback_item(self, image_path):
        """Create basic item entry without AI"""
        filename = Path(image_path).stem
        return {
            "box_id": "UNK",
            "box_id_confidence": "low",
            "items": [
                {
                    "item_name": filename.replace('_', ' ').replace('-', ' ').title(),
                    "category": "Uncategorized",
                    "description": "Item requires manual description",
                    "quantity": 1,
                    "notes": "Processed without AI analysis",
                    "captions": [filename],
                    "people": [],
                    "tags": ["needs-review"],
                    "pub": None,
                    "ocr_text": ""
                }
            ]
        }

    def create_filename_slug(self, text):
        """Create URL-safe filename slug"""
        import re
        text = text.lower()
        text = re.sub(r'[^a-z0-9]+', '-', text)
        text = text.strip('-')
        return text[:50]  # Limit length

    def process_image(self, image_path, family_names=None):
        """Process a single image"""
        print(f"Processing: {image_path}")

        # Calculate hash
        sha1_hash = self.calculate_sha1(image_path)

        # Check if already processed
        if sha1_hash in self.existing_hashes:
            print(f"  ⊗ Duplicate (already in catalog as {self.existing_hashes[sha1_hash]})")
            return

        # Analyze with AI
        ai_result = self.analyze_image_with_ai(image_path, family_names)

        box_id = ai_result.get("box_id") or "UNK"
        detected_items = ai_result.get("items", [])

        if not detected_items:
            print("  ⚠ No items detected")
            return

        date_found = datetime.now().strftime("%Y-%m-%d")
        base_filename = Path(image_path).stem

        # Process each detected item
        for idx, item_data in enumerate(detected_items):
            item_num = idx + 1
            item_id = f"it_{datetime.now().strftime('%Y%m%d')}_{self.item_counter:06d}"
            self.item_counter += 1

            # Create renamed image filename
            slug = self.create_filename_slug(item_data["item_name"])
            new_filename = f"{datetime.now().strftime('%Y%m%d')}_box-{box_id}_{slug}_n{item_num:02d}{Path(image_path).suffix}"
            thumb_filename = f"thumb_{new_filename}"

            # Copy and rename image
            new_image_path = IMG_DIR / new_filename
            thumb_image_path = IMG_DIR / thumb_filename

            shutil.copy2(image_path, new_image_path)
            self.create_thumbnail(new_image_path, thumb_image_path)

            # Get box friendly name
            box_category = box_id[:2] if len(box_id) >= 2 else "UNK"
            box_location = box_id[-2:] if len(box_id) > 2 and box_id[-2:] in LOCATIONS else box_id[-1:] if len(box_id) > 2 and box_id[-1:] in LOCATIONS else ""

            category_name = BOX_CATEGORIES.get(box_category, "Unknown")
            location_name = LOCATIONS.get(box_location, "")

            box_friendly = f"{category_name}"
            if location_name:
                box_friendly += f" - {location_name}"

            # Create catalog entry
            catalog_entry = {
                "id": item_id,
                "box_id": box_id,
                "box_friendly": box_friendly,
                "category": item_data.get("category", "Uncategorized"),
                "item_name": item_data.get("item_name", "Unknown Item"),
                "quantity": item_data.get("quantity", 1),
                "description": item_data.get("description", ""),
                "notes": item_data.get("notes", ""),
                "captions": item_data.get("captions", []),
                "people": item_data.get("people", []),
                "date_found": date_found,
                "image_files": [
                    {
                        "full": new_filename,
                        "thumb": thumb_filename
                    }
                ],
                "ocr": {
                    "box_id_detected": box_id,
                    "raw_text": item_data.get("ocr_text", "")
                },
                "pub": item_data.get("pub"),
                "hashes": {
                    "sha1": sha1_hash,
                    "phash": None
                },
                "box_history": [
                    {
                        "box_id": box_id,
                        "from": date_found,
                        "to": None
                    }
                ],
                "tags": item_data.get("tags", [])
            }

            self.new_items.append(catalog_entry)
            self.existing_hashes[sha1_hash] = item_id

            print(f"  ✓ Created item: {catalog_entry['item_name']} ({item_id})")

    def create_delta_file(self):
        """Create incremental delta file"""
        if not self.new_items and not self.updated_items:
            print("No changes to save")
            return None

        delta_version = datetime.now().strftime("%Y-%m-%d")
        delta_filename = f"{delta_version}.json"
        delta_path = UPDATES_DIR / delta_filename

        # Create changelog
        changelog_parts = []
        if self.new_items:
            box_counts = {}
            for item in self.new_items:
                box_id = item["box_id"]
                box_counts[box_id] = box_counts.get(box_id, 0) + 1

            box_summary = ", ".join(f"{box}:{count}" for box, count in sorted(box_counts.items()))
            changelog_parts.append(f"Added {len(self.new_items)} items ({box_summary})")

        if self.updated_items:
            changelog_parts.append(f"Updated {len(self.updated_items)} items")

        changelog = "; ".join(changelog_parts)

        delta = {
            "delta_version": delta_version,
            "added": self.new_items,
            "updated": self.updated_items,
            "removed": [],
            "changelog": changelog
        }

        with open(delta_path, 'w', encoding='utf-8') as f:
            json.dump(delta, f, indent=2, ensure_ascii=False)

        return delta_filename

    def update_updates_index(self, delta_filename):
        """Update the updates index file"""
        if UPDATES_INDEX.exists():
            with open(UPDATES_INDEX, 'r', encoding='utf-8') as f:
                index = json.load(f)
        else:
            index = {"last_updated": "", "deltas": []}

        if delta_filename not in index["deltas"]:
            index["deltas"].append(delta_filename)

        index["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with open(UPDATES_INDEX, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2)

    def save_catalog(self):
        """Save catalog data"""
        # Update base catalog with new items
        self.catalog_data["items"].extend(self.new_items)
        self.catalog_data["catalog_version"] = datetime.now().strftime("%Y.%m.%d.%H%M")

        # Backup existing base file
        if BASE_JSON.exists():
            backup_filename = f"items_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            backup_path = ARCHIVE_DIR / backup_filename
            shutil.copy2(BASE_JSON, backup_path)
            print(f"Backed up catalog to: {backup_filename}")

        # Save updated base file
        with open(BASE_JSON, 'w', encoding='utf-8') as f:
            json.dump(self.catalog_data, f, indent=2, ensure_ascii=False)

        # Create delta file
        delta_filename = self.create_delta_file()
        if delta_filename:
            self.update_updates_index(delta_filename)
            print(f"Created delta file: {delta_filename}")

    def process_batch(self, photo_dir, family_names=None):
        """Process a batch of photos"""
        photo_path = Path(photo_dir)
        if not photo_path.exists():
            print(f"Error: Directory not found: {photo_dir}")
            return

        # Find all image files
        image_extensions = {'.jpg', '.jpeg', '.png'}
        image_files = [
            f for f in photo_path.iterdir()
            if f.suffix.lower() in image_extensions
        ]

        if not image_files:
            print(f"No image files found in {photo_dir}")
            return

        print(f"\nFound {len(image_files)} image(s) to process\n")

        for image_file in sorted(image_files):
            self.process_image(image_file, family_names)

        # Save results
        if self.new_items or self.updated_items:
            self.save_catalog()
            print(f"\n✅ Processing complete!")
            print(f"   Added: {len(self.new_items)} items")
            print(f"   Updated: {len(self.updated_items)} items")
        else:
            print("\n⊗ No new items to add")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Process household archive photos")
    parser.add_argument("photo_dir", help="Directory containing photos to process")
    parser.add_argument("--family-names", help="Comma-separated list of family names to watch for")
    parser.add_argument("--api-key", help="Anthropic API key (or set ANTHROPIC_API_KEY env var)")

    args = parser.parse_args()

    family_names = None
    if args.family_names:
        family_names = [name.strip() for name in args.family_names.split(',')]

    processor = CatalogProcessor(api_key=args.api_key)
    processor.process_batch(args.photo_dir, family_names)


if __name__ == "__main__":
    main()
