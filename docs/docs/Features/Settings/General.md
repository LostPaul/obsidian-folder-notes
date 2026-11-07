# General settings
### Folder note name template
The entered text is going to be the name of all folder notes and when file name matches this text it becomes a folder note. {{folder_name}} is a placeholder for the name of the folder linked to the file. If you change the text every existing folder note which matched the old text won't be a folder note anymore and you have to use the button "Rename existing folder notes" to rename all folder notes.

### Alternative folder note names
Extra name templates, one per line, that are also recognized as folder notes, for example `{{folder_name}}.local`. The plugin looks for a file matching the folder note name template first and then tries these in order, so `Folder.md` wins over `Folder.local.md` when both exist. New folder notes and "Rename existing folder notes" only use the folder note name template. When you rename a folder, its folder note keeps the name form it has (`Folder.local.md` becomes `New name.local.md`), and other files with a folder note name for that folder are renamed along with it.

### Prefer alternative folder note names
When enabled, the alternative names are checked before the folder note name template, so `Folder.local.md` wins over `Folder.md`. The other file stays a normal note in the folder.

This is useful when some folder notes should stay out of version control: name them `{{folder_name}}.local` and ignore `*.local.md` in `.gitignore`.

### Supported file types
Only the file types you select will be selected will be recognized as folder notes. This means you that a file that matches the name of a folder and normally would be a folder note but has an extension that isn't included in the supported file types list won't be a folder note and you can't open it by click on the folder name.

### Template path
When you don't have templater installed & enabled you can choose any file in your vault as a template. But if you have templater enabled you first have to choose the folder where your templates are located, in the settings of the templater plugin. You can also use the core templates plugin for applying templates to new folder notes.

### Storage location
Choose if the folder notes should be stored in the folder they're linked to or in the parent folder of the folder they're linked to. If you switch the storage method all existing folder won't be recognized as folder notes anymore until you click on the switch button and the location of old folder note files gets changed.

## Folder note behavior
### Confirm folder note deletion
When enabled a modal pops up when you try to delete folder note using the context menu.
### Open folder note in a new tab by default
When enabled every folder note opens in a new tab unless it is already open in the currently focused file in the editor and if the subsetting "focus existing tab instead of creating a new one" is also enabled every folder note only has one tab open. If you have different tab open than of a folder note you want to open and the folder note already has a tab open it'll switch to it.

## Integration & Compatibility
### Enable [front matter title plugin](https://github.com/snezhig/obsidian-front-matter-title) integration
Applies the changes made to the files names in the frontmatter also to the folder names in the file explorer & the path for folders with folder notes. This is also requires to enable the auto update setting in the file explorer & path settings of the folder notes plugin.

## Session & Persistence

### Persist tab after restart
Open the same tab you had open in the plugin settings before restarting Obsidian.
### Persist tab during session only
Open the same tab after closing the plugin settings and opening it again but if "Persist tab after restart" is disabled it won't open the same tab again after restarting Obsidian.