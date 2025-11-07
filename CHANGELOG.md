# Changelog

All notable changes to the Household Archive Catalog will be documented here.

## [1.0.0] - 2025-01-06

### Initial Release

**Features:**
- HTML catalog interface with search, filter, and sort
- Python script for AI-powered photo processing
- OCR-based box label detection
- Incremental delta updates
- Local edit mode with export
- Box movement tracking
- Publication tracking for magazines/newspapers
- Responsive, accessible design
- URL-based filter sharing

**Data Structure:**
- Base catalog (items.base.json)
- Incremental deltas (updates/)
- Box key reference
- Image management with thumbnails

**Processing:**
- Claude Vision API integration
- SHA1-based deduplication
- Automatic thumbnail generation
- Family names tracking
- Museum-quality descriptions

---

## Future Enhancements

Ideas for future versions:

- [ ] Bulk box reassignment tool
- [ ] CSV export
- [ ] Print-friendly labels
- [ ] Mobile app for photo capture
- [ ] Integration with Google Drive API for live editing
- [ ] Advanced search with boolean operators
- [ ] Image comparison for duplicates
- [ ] Batch re-OCR tool
- [ ] Statistics dashboard
