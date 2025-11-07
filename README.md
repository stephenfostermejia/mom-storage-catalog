# Mom's Household Archive Catalog

An AI-powered cataloging system for household storage items with searchable HTML interface.

## Features

- 📸 AI-powered photo analysis with OCR
- 🔍 Full-text search across all fields
- 🏷️ Box tracking and movement history
- ✏️ On-page editing with local storage
- 📊 Incremental updates (no data loss)
- 📱 Responsive, accessible interface
- 💾 Export edits as JSON

## Quick Start

### 1. Process Photos

```bash
# Install dependencies
pip install anthropic pillow

# Set your Anthropic API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Process a batch of photos
python process_photos.py /path/to/photos

# With family names for publication tracking
python process_photos.py /path/to/photos --family-names "Gloria Mejia,Stephen Foster"
```

### 2. View Catalog

Open `index.html` in your web browser, or deploy to Netlify/any static host.

## File Structure

```
mom-storage-catalog/
├── index.html           # Main catalog interface
├── style.css            # Styling
├── app.js               # Application logic
├── process_photos.py    # Photo processing script
├── data/
│   ├── items.base.json       # Base catalog
│   ├── updates_index.json    # Delta file index
│   ├── box_key.json          # Box coding reference
│   └── updates/              # Incremental deltas
│       └── YYYY-MM-DD.json
├── img/                 # Images (originals + thumbs)
├── archive/             # Backup files
└── README.md
```

## Box Naming Convention

Format: `CC##[Location]`

**Categories (CC):**
- DO = Documents
- KN = Knickknacks
- OS = Office Supplies
- CL = Clothing
- KT = Kitchen Items
- BK = Books
- EL = Electronics
- TO = Tools
- ME = Memorabilia
- DC = Decor Items
- TR = Toys
- PI = Pictures
- AN = Antiques
- GE = Genealogy Files
- MG = Magazines/Newspapers

**Locations:**
- L = Living Room
- M = Mom's Room
- G1 = Guest Room 1
- G2 = Guest Room 2
- S = Storage Room

**Examples:** `DO3M`, `KT2L`, `AN4G1`

## How to Update the Catalog

1. Place new item photos in a folder
2. Run: `python process_photos.py /path/to/folder`
3. Upload the generated images to `/img/`
4. Upload the new delta JSON to `/data/updates/`
5. Replace `/data/updates_index.json` with the new one
6. Refresh the catalog page

## Editing Items

1. Click "Enable Edit Mode"
2. Click any item to view details
3. Click editable fields (name, description, notes, etc.)
4. Changes save to local storage automatically
5. Click "Export Edits" to download `mom_edits.json`
6. Include this file when processing next batch to apply edits

## Deploying to Netlify

### Option 1: Drag & Drop
1. Zip the entire `mom-storage-catalog` folder
2. Go to netlify.com
3. Drag the ZIP onto the deploy area
4. Done!

### Option 2: Git Repository
1. Create a GitHub repository
2. Push your catalog folder
3. Connect to Netlify
4. Auto-deploy on every push

## Search Tips

- **Search everything:** Type in the search box to search names, descriptions, tags, people, publications
- **Filter:** Use dropdowns to narrow by box, category, or person
- **Sort:** Change sort order (date, name, box)
- **Share:** URL updates with filters - copy and share links to specific searches

## Data Structure

### Item Entry
```json
{
  "id": "it_20250106_000001",
  "box_id": "DO3M",
  "box_friendly": "Documents - Mom's Room",
  "category": "Documents > Family",
  "item_name": "Gloria Mejia newspaper clipping",
  "quantity": 1,
  "description": "Family clipping from Pleasanton school article...",
  "notes": "Place in plastic sleeve",
  "captions": ["Newspaper clipping..."],
  "people": ["Gloria Mejia"],
  "date_found": "2025-01-06",
  "image_files": [
    {"full": "...", "thumb": "..."}
  ],
  "ocr": {
    "box_id_detected": "DO3M",
    "raw_text": "..."
  },
  "pub": {
    "publication_name": "Pleasanton Express",
    "date_of_issue": "1999-10-12",
    "page_number": "A3",
    "names_mentioned": ["Gloria Mejia"]
  },
  "box_history": [
    {"box_id": "DO3M", "from": "2025-01-06", "to": null}
  ],
  "tags": ["newspaper", "family", "school"]
}
```

## Troubleshooting

**Q: Images not loading?**
A: Check that image files are in `/img/` and filenames match the JSON entries.

**Q: No data showing?**
A: Ensure `data/items.base.json` exists and is valid JSON.

**Q: AI analysis not working?**
A: Make sure `ANTHROPIC_API_KEY` environment variable is set.

**Q: How to reset local edits?**
A: Open browser console and run: `localStorage.removeItem('catalog_edits')`

## System Requirements

- **Processing:** Python 3.8+, Anthropic API key
- **Viewing:** Any modern web browser
- **Hosting:** Any static web host (Netlify, Vercel, GitHub Pages, etc.)

## Version History

- **1.0.0** (2025-01-06) - Initial release

## Support

For issues or questions, contact Stephen.

---

Made with care for Mom's archive project.
