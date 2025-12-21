# Daily Notes Timeline

A fork of [Daily Notes Editor](https://github.com/Quorafind/Obsidian-Daily-Notes-Editor) by [Quorafind/Boninall](https://github.com/Quorafind).

View and edit all your daily notes in a single scrollable timeline.

![Daily-Note-View](https://raw.githubusercontent.com/Quorafind/Obsidian-Daily-Notes-Editor/master/image/Daily-Note-View.gif)

## What's New in This Fork

This fork adds three quality-of-life improvements:

### 1. Auto-focus Today's Note
When you open the timeline, your cursor automatically jumps to today's note, ready to type. No more scrolling or clicking to start writing.

### 2. Reuse Existing Tab
Opening the timeline reuses an existing tab instead of creating duplicates. Keeps your workspace clean.

### 3. Click to Open in Timeline
Click any daily note in the file explorer and it opens in the timeline view, scrolling directly to that note. Your daily notes always open in context.

## Installation

**Manual Installation:**
1. Download the latest release
2. Extract to `.obsidian/plugins/daily-notes-timeline/`
3. Enable in Settings → Community Plugins

## Settings

| Setting | Description |
|---------|-------------|
| **Auto focus today's note** | Cursor jumps to end of today's note when opening |
| **Switch to existing editor** | Reuse existing timeline tab instead of opening new ones |
| **Open daily notes in timeline** | Clicking a daily note opens it in the timeline view |
| Hide frontmatter | Hide YAML frontmatter in notes |
| Hide backlinks | Hide backlinks section |
| Open on startup | Auto-open timeline when Obsidian starts |

## Usage

1. Open via Command Palette: `Open Daily Notes Editor`
2. Or click the calendar icon in the ribbon
3. Click any daily note in the sidebar to jump to it in the timeline

## All Features

- View multiple daily notes in one scrollable page
- Filter by time range (week, month, year, custom)
- Multiple view modes: Daily Notes, Folder, Tag
- Sort by creation/modification time
- Save presets for quick access
- Keyboard navigation between notes
- Right-click folders to view all notes

## Credits

**Original Plugin:**
[Daily Notes Editor](https://github.com/Quorafind/Obsidian-Daily-Notes-Editor) by [Quorafind/Boninall](https://github.com/Quorafind)

**PR #77 Features (autofocus + reuse tab):**
[Marijn Bent](https://github.com/marijnbent)

**Upstream Dependencies:**
- [Hover Editor](https://github.com/nothingislost/obsidian-hover-editor) - Workspace leaf code
- [Obsidian Daily Notes Interface](https://github.com/liamcain/obsidian-daily-notes-interface) - Daily notes API
- [Make.md](https://www.make.md/) - Original inspiration

## License

Same license as the original project.
