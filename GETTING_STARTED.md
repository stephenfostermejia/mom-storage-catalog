# Getting Started with Mom's Archive Catalog

## Quick Setup (5 minutes)

### Step 1: Install Python Dependencies

```bash
cd C:\Users\steph\Documents\mom-storage-catalog
pip install -r requirements.txt
```

### Step 2: Get an Anthropic API Key

1. Go to: https://console.anthropic.com/
2. Sign up / Log in
3. Go to "API Keys" section
4. Create a new API key
5. Copy it

### Step 3: Set Your API Key

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="your-api-key-here"
```

**Windows (Command Prompt):**
```cmd
set ANTHROPIC_API_KEY=your-api-key-here
```

**Or create a `.env` file:**
```
ANTHROPIC_API_KEY=your-api-key-here
```

### Step 4: Process Your First Batch

1. Create a folder with test photos (e.g., `C:\test-photos\`)
2. Make sure at least one photo shows a Box ID label
3. Run the processor:

```bash
python process_photos.py C:\test-photos
```

4. Watch as it:
   - Reads box labels with OCR
   - Detects items
   - Generates descriptions
   - Creates catalog entries

### Step 5: View the Catalog

**Option A: Open Locally**
- Double-click `index.html`
- Or visit: http://localhost:8080 (if web server running)

**Option B: Deploy to Netlify**
1. Zip the entire `mom-storage-catalog` folder
2. Go to https://app.netlify.com/drop
3. Drag the ZIP file
4. Get your live catalog URL!

## Your First Workflow

1. **Take Photos:**
   - Take photos of items with a visible Box ID label
   - Multiple items per photo is fine
   - Good lighting helps OCR

2. **Process:**
   ```bash
   python process_photos.py /path/to/photos --family-names "Gloria Mejia,Stephen Foster"
   ```

3. **Upload to Netlify:**
   - Upload new images from `/img/` folder
   - Upload new delta JSON from `/data/updates/`
   - Replace `/data/updates_index.json`

4. **View & Edit:**
   - Open your Netlify site
   - Search for items
   - Enable Edit Mode to fix descriptions
   - Export edits and include in next batch

## Box Labeling Tips

For best OCR results:

- Use clear, printed labels
- Format: `DO3M`, `KT2L`, etc.
- Put label in top-left of storage box
- Include label in at least one photo per box

Example label:
```
━━━━━━━━━━━━━
   DO3M
 Documents
 Mom's Room
━━━━━━━━━━━━━
```

## What Happens During Processing?

```
Photo → Claude Vision API
  ↓
  ├─ Reads Box ID (OCR)
  ├─ Detects items in photo
  ├─ For each item:
  │   ├─ Generates name
  │   ├─ Writes description
  │   ├─ Extracts people names
  │   ├─ Adds relevant tags
  │   └─ Logs publication info (if applicable)
  ↓
Catalog Entry Created
  ↓
Images Renamed & Thumbnailed
  ↓
Delta JSON Saved
  ↓
Updates Index Updated
```

## Common Questions

**Q: Can I edit the catalog directly?**
A: Yes! Enable Edit Mode, click items, edit fields. Export your edits and include the JSON file when processing the next batch.

**Q: What if Box ID isn't detected?**
A: The system will use "UNK" and tag it for review. You can edit it manually.

**Q: Can I reprocess photos?**
A: The system detects duplicates by image hash, so reprocessing is safe - duplicates are skipped.

**Q: How do I fix mistakes?**
A: Use Edit Mode in the web interface, or manually edit the JSON files in `/data/`.

**Q: Where's my data stored?**
A: - Base catalog: `/data/items.base.json`
   - Updates: `/data/updates/YYYY-MM-DD.json`
   - Backups: `/archive/`

## Next Steps

- [ ] Test with a small batch of photos
- [ ] Review the generated catalog
- [ ] Deploy to Netlify
- [ ] Share the URL with Mom
- [ ] Start cataloging the real archive!

## Need Help?

Check:
- `README.md` - Full documentation
- `CHANGELOG.md` - Version history
- Console errors in web browser (F12)
- Python errors when processing

---

Happy cataloging!
