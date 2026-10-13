<!--
Release notes for public releases, newest first. Each release is a "## <version>" section, and the
release workflow publishes the section whose version matches the tag. Add the next release's
section at the top before tagging; the release fails if the section is missing or empty.
Text inside comments like this one is not shown on GitHub.
-->

## 1.8.27
- Fix for #93: no more freezing when moving or renaming large folders
- Fix for #331: folder notes sometimes not opening on folder click
- Fix for #287 and #343: overview links disappearing from the graph view
- Fix for #332, #315, #335, #283, #345, #309, #337
- Fixed folder overviews making Obsidian laggy over time (#353)
- New advanced setting "File explorer reveal margin" (#274)

## 1.8.26
Fix for #328

## 1.8.25
Small fix for plugin not loading on some mobile devices.

## 1.8.24
- Fix for #274
- Fixed an issue with the option to hide the folder note name in the path
- Fixed many issues reported by the ESLint plugin from Obsidian
- Fixed a bug where when you had auto-create for folder notes enabled non-supported file types would trigger an auto folder note creation

Transition to the new settings api is coming soon

I've also enabled GitHub Sponsors on my profile

## 1.8.19
- Option to hide folder note name in the path and only show the folder name when the folder note is currently open
- Fix for #312
- Fix for #306
- Fix for #284
- Fix for #304

## 1.8.18
- Fix #296
- Fix #293
- Fix #300
- Make.md integration (#299)
- Option to use wiki links in folder overviews

More updates coming in a month and maybe I'll fix #284 in the next few days

## 1.8.17
- Remove empty command on mobile
- Update folder overview (real) link list in the background so that you don't have to keep the file open in order to update the links in the graph view
- Added .base as a default file type option
- Fix #275
- Fix #258 / #256
- Fix #256
- Fix #268
- Support folder overview in a callout

I've created two channels for beta users and also a role on the discord.
For the people who donate to me on ko-fi I've also create a role and a channel.
https://discord.gg/4UQEDfQmuH

## 1.8.16
- Fix #259
- Fix #253
- Add information about why you can't select a template file when you use templater & don't have the templates folder plugin set

## 1.8.15
- Fix #256
- Fix duplicated template using templates
- Frontmatter title plugin integration for the folder overview feature

## 1.8.13
- Fix #248
- Fix #250
- Fix https://github.com/LostPaul/obsidian-folder-overview/issues/16

## 1.8.12
- Fixed https://github.com/LostPaul/obsidian-folder-overview/issues/14 (when you had a large overview and scrolled in reading mode it disappeared after some time)

## 1.8.11
- Links from the folder overview can now appear in the graph view when the option "use actual links" has been enabled
- Added "Edit folder overview" to the context menu when right clicking on a folder overview
- Added a notice when using "Insert folder overview" for the first time, with information about the feature

## 1.8.10
- Fix #247
- Fix choose folder note type modal

## 1.8.8
- Fixed issue where the folder path couldn't be changed in folder overview
- Removed Enter key listener to caused accidental file openings

## 1.8.7
### Folder Notes v1.8.0 Public Update
- Performance improvements especially for larger vaults
- Fixed css issues with some themes
- [Folder overview](https://lostpaul.github.io/obsidian-folder-notes/Folder%20overview/) is now a separate plugin (but you don't need to install it to use it, to have the folder note plugin installed is enough to use it and you need to have the folder notes plugin installed to use the folder overview plugin)
- Added a few confirmation modals to avoid accidental actions
- You can now detach folder notes from folders to move them somewhere else and stop the name sync
- Hide/show individual folder notes in the file explorer
- Override excluded folders with a whitelist
- Fixed a few bugs
- Updated the docs & setting description/title names

[I also created an discord server](https://discord.gg/4UQEDfQmuH)

## 1.7.35
Small change that makes it possible to use the plugin and https://github.com/LostPaul/obsidian-folder-overview at the same time.

## 1.7.32
- Fix for #148 & #156

## 1.7.31
- Fix the template path issue (#146)
- Fix the collapse icon style issue (#148)

## 1.7.30
- Fix style loading issues with the latest Obsidian version (see #145)

## 1.7.26
- You can choose now if you want to move folder notes to the Obsidian/System trash or if you want to permanently the folder note
- and you can also renable the modal that asks if you want to delete the folder note exactly like it's possible in Obsidian for the normal files
- This also fixes #142 as well as #120

Sorry again for only a minor update again but it was necessary because of the more serious bug.
But I'm currently working simultaneously on a beta version that will include some bigger changes.

New updates shouldn't take too long anymore in the feature because I've changed the way I can release changes, now there's a branch only for beta updates and if I need to release an urgent change I can now just update the last release in a different branch without having to change anything in the main branch or in beta branch. This means I can more easily and faster fix bugs without also releasing other features.

## 1.7.22
- Removed unnecessary console.logs to fix #107

More useful updates coming soon 👀

## 1.7.20
- Fixed excluded folders path bug and style reload issues

## 1.7.14
- Fixed #84

## 1.7.12
- Fixed #81
- Fixed collapse icon hiding even though the folder is not empty
- Changed the code structure a bit

## 1.7.11
- Fixed #79
- Removed setting headers for each tab in the plugin settings

## 1.7.10
- Fix active file class getting applied to normal folders with no folder notes

## 1.7.9
- Fix hide collapse icon feature
- Option to use folder name in the tab title instead of the note name
- Add active file class to newly created folder notes

## 1.7.5
- Added option to hide collapse indicator when a folder has no other files than the folder note #51

## 1.7.4
- Copy Obsidian URL from folder note through the folder #77

## 1.7.3
- Fixed right click #76

## 1.7.2
- The middle click from your mice now opens a file in a new tab (#74)

## 1.7.1
- Added default settings for excluded folders
- The documentation has been updated with almost all the major features

**Full Changelog**: https://github.com/LostPaul/obsidian-folder-notes/compare/1.6.0...1.7.0

## 1.6.16
- Option to open folder notes only with ctrl/alt and collapse the folder with the normal click
- Fixed ITS theme style bug for the folder overview #53
- Fixed an issue with the disable collapsing setting
- Fixed an issue that the bold/italic styles went away after restarting Obsidian

## 1.6.15
- Show hover popup when using ctrl on folder notes

## 1.6.14
- Fix template issue #68
- Added option to folder overview to remove collapse icon when a folder note has no other files#69

## 1.6.13
- Added a "helpUrl" in the manifest to support the [HelpMate plugin](https://github.com/TfTHacker/obsidian42-HelpMate)

## 1.6.11
Fix #63

## 1.6.10
Fix #64

## 1.6.9
Fix #58

## 1.6.8
- Fixed the issue #35 and a issue when renaming all folder notes
- The plugin now creates a command for every supported folder note file type, as an actual command and in the context menu
- Fixed issue #57

## 1.6.6
Fixed #56

## 1.6.5
- Bold and cursive options for the name of folder notes in the path and file explorer
- Fixed a few bugs

## 1.6.3
- Fixed the second issue of #53
- Fixed an issue with the create folder note command

## 1.6.2
- Fixed a template bug

## 1.6.1
- Fixed a bug with Excalidraw

## 1.6.0
- Support for Excalidraw and unlimited other file extensions
- Option to choose the file extension before creating a new folder note
- Template support for every extension including Excalidraw

## 1.5.15
- Fixed issue with the core template plugin
- Two new commands
- One for inserting a folder overview in a note
- and the other one for creating a new folder from a selected text

## 1.5.14
- Fixed #49

## 1.5.13
- Tabs for the settings page
![RjA1e8XrWOte8iNRhg6M](https://github.com/LostPaul/obsidian-folder-notes/assets/70213368/28bbf2b9-56f5-47f1-aeb8-3f3f29515fb5)

## 1.5.12
- Fix turning canvas into markdown note
- Exclude source file in the folder overview

## 1.5.11
- Fix sort after issues and missing edit overview button bug

## 1.5.10
- Fix for a sort after bug and included file types bug

## 1.5.3
### Folder overview updates
- Explorer style
- Show folder notes option
- Sort files by separation of for example name and ascending
- Change the folder for the overview and not only show it for the folder of the current note
- Change the defaults for the overview in the plugin settings
- Edit overview button when there are no files/folders displayed
- Fixed some bugs

### Other updates
- Created a few new files that you can for example access through ctrl + p
- Turn note into folder note
- Create new folder in the parent folder of the current active note and make the active note the folder note of it
- Create/Delete/Open folder note for the parent folder of the active note

## 1.4.9
Fixed another bug with excluding folders in the folder overview

## 1.4.8
- Fixed one bug where you couldn't use * to exclude folders

## 1.4.7
- Exclude folder from the folder overview

## 1.4.6
- Create folder notes for existing folders with one button
- Ignore folders with the excluded folder feature
- The feature also supports regex

## 1.4.5
- Fixed one bug with the front matter title plugin integration

## 1.4.4
- Fixed style of excluded folder list

## 1.4.3
- Support for the front matter title plugin (https://github.com/snezhig/obsidian-front-matter-title)
- It allows you to change the name of a folder in the file explorer and in the path above a note
- Disable it for the file explorer or the path in the folder notes settings
- When you for example have set the name "test" with the front matter title plugin for a folder note the folder automatically also changes to the same name


https://github.com/LostPaul/obsidian-folder-notes/assets/70213368/fb0e94ce-a774-4477-8344-455ec23a95fb

## 1.4.1
- Dropdown option to include every file type in the list at once
- Fixed a bug where one setting in the modal for the folder overview didn't get removed correctly

## 1.4.0
- Option to show subfolders from the current folder in the list
- More file types supported in the dropdown for the included file types in the folder overview
- Option to show folders without files in the list

## 1.3.9
- {{foldername}} variable for the folder overview title

## 1.3.8
- Insert folder overview command
- Fixed style bug with theme
- Sort by created/modified with asc option

## 1.3.7
- Sort by option
- Fix empty folder overview settings modal

## 1.3.6
- Folder overview codeblock (grid style soon)
- Submenu support for file/folder commands (can be toggled off in the settings)
- Improved renaming for the storage option outside folders
- Option to move folder notes with folders
- Fixed a bug where create folder note would delete the file contents

## 1.3.4
- Create folder note now works on notes and it creates a folder and turns the note you used it on into a folder note for the new folder
- Turn into a folder note now asks if you want to rename the existing folder note if there is one and you used it for the first time


![xeQoG8JRsF1dBuQysquW](https://github.com/LostPaul/obsidian-folder-notes/assets/70213368/b4c98cb1-c595-4c5c-bc3f-fa86d2efd305)

## 1.3.1
- Create folder notes through text in notes just like normal links
- Turn existing notes into folder notes even when the folder already has a folder note
- Open folder notes through a button in the menu when you right click a folder
- Fixed delete folder note button

https://github.com/LostPaul/obsidian-folder-notes/assets/70213368/5d19e399-e868-4470-927f-255cad143745

## 1.2.5
- Exclude folders by using regex or wildcards

Check out the settings page for more information
- Add {regex} at the beginning of the folder name to use a regex pattern.
- Use * before and after to exclude folders that include the name between the *s.
- Use * before the folder name to exclude folders that end with the folder name.
- Use * after the folder name to exclude folders that start with the folder name.

## 1.2.4
- Store folder notes either inside their folder they belong or in the parent folder
- Switch the storage location in the settings by using the dropdown and the button to move existing folder notes
- When you disable the option to open folder notes through the path the observer no longer listens for updates which means theoretically the performance is slightly better
- Fixed some bugs

## 1.2.3
- Fixed outline style issue
- Added funding url and splitted function in multiple files

## 1.2.2
- Use the accent color in the settings instead of purple

## 1.2.1
Thank you for 1000 downloads, you're now able to support my work by donation through https://ko-fi.com/paul305844
- Canvas is now supported as a folder note
- You're now able to change the folder note file name to something like {{folder_name}}_index in the settings
- Fixed some bugs and improved some functions slightly

## 1.2.0
- Option to open folder notes always in a new tab instead of having to use ctrl all the time
- Improved setting names and descriptions of them

## 1.1.9
- Fixed styling issue with folder icons in the Anuppucin theme
- Css classes now get loaded when you enable the plugin for the first time

## 1.1.8
Added a notice for the template path in the settings.

## 1.1.7
Fixed the bug where you couldn't open folder notes through the path when you tried it from a file that was located in on of the first folders in the path of the vault.

## 1.1.6
You are now able to open existing folder notes in a new tab with ctrl and clicking on the folder note or with whatever key you're using to open notes in a new tab.

## 1.1.5
- Allow users to open folder notes in a new tab with ctrl

## 1.1.4
- Create & open folder notes through the path
- Enable/Disable underlining of folder names in the path by using the plugin settings
- Enable/Disable opening of folder notes through the path

https://user-images.githubusercontent.com/70213368/233779948-7eb68ed9-0cba-47ea-9525-250fdae42f29.mp4

## 1.1.3
Folders new get focused in the file explorer if you click on them and if they have a folder note.

Now
![Md6a2Ul4dAv1IlxsAOsi](https://user-images.githubusercontent.com/70213368/231743233-fe336c9e-7e0d-4c44-9edb-734f012e6522.gif)

Before
![2R9cDxquN1oWVcND2pTh](https://user-images.githubusercontent.com/70213368/231743270-32650900-42cb-4a36-8ae2-07f5187db9e2.gif)

Thanks for the PR, @cdloh

## 1.1.2
- Styles now work from startup and are applied correctly regardless of file explorer status (ie if the child is shown / expanded) and automatically updates styles when files change.

- File Renaming is now handled in a few more scenarios.

- Excluded folder now correctly cascades to more than one folder down.

Thanks for the PR, @cdloh

## 1.1.1
- Changed naming of css class that prevents collapsing of folders when clicking whitespace
- The same class now also gets added on plugin load
- Css classes that got added to the document body now get removed when the plugin gets unloaded

## 1.1.0
- The macOS cmd key is now supported for creating folder notes with cmd + click
- Folders that have folder notes now get instantly underlined when you ctrl//cmd/alt + click on a folder name

## 1.0.11
You can now toggle in the settings if you want the folders to collapse when you click on the whitespace around of the folder name

## 1.0.10
- Update styles.css

## 1.0.9
Fixed folder note name syncing issues and also excluded folder paths syncing issues.

## 1.0.8
Fixed some folder note name sync issues

## 1.0.7
- No release notes

## 1.0.6
- Fixed folder name sync issues

## 1.0.5
- Fix folder name sync bug for subfolders

## 1.0.4
Fixed the issue where you couldn't create a folder note using the menu that gets displayed when you right click on a folder (#2)

## 1.0.3
- Update styles.css
- Update deleteConfirmation.ts
- Delete confirmation modal mobile support
- Update README.md
- Update README.md
- Update README.md
- Delete folders.png
- Update main.ts
- Update main.ts
- Underline folder names that have folder notes
- Update deleteConfirmation.ts
- Delete folder note confirmation modal
- Delete folder note modal

## 1.0.2
- Create folder note button

## 1.0.1
- Update settings.ts
