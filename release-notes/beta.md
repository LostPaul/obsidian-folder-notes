<!--
Release notes for beta releases, newest first. Each release is a "## <version>" section, and the
beta release workflow publishes the section whose version matches the tag. Add the next beta's
section at the top before tagging; the release fails if the section is missing or empty.
Text inside comments like this one is not shown on GitHub.
-->

## 1.8.27-3-beta
- Fix for #335: underline disappearing after naming a new note

## 1.8.27-2-beta
- Fix for #93: no more freezing when moving or renaming large folders
- Fix for #331: folder notes sometimes not opening on folder click
- Fix for #287 and #343: overview links disappearing from the graph view
- Fix for #332, #315, #335, #283, #345, #309, #337
- Fixed folder overviews making Obsidian laggy over time (#353)
- New advanced setting "File explorer reveal margin" (#274)

## 1.8.27-1-beta
- Possibly fix not being able to click on folder note to open it
- Add advanced setting for #274
- Fix #337
- Potential fix for pull request finding
- Bug Fix #330 & #332
- Update main.ts

## 1.8.20-1-beta
- Fix function for getting the folder of a folder note
- Bump minimatch

## 1.8.17-5-beta
Fix #275

## 1.8.17-2-beta
- Fix editing folder overviews who are in a callout

## 1.8.17-0-beta
- Fix #268 & #258
- Fix #267
- Fix folder highlighting for folders without folder notes
- Update folder overview in the background to update the links the graph view
- Change the folder overview title size
- Add .base as a default folder note option

## 1.8.5-3-beta
- Fix https://github.com/LostPaul/obsidian-folder-overview/issues/13
- Add missing css code for folder overview

## 1.8.5-2-beta
Fix handling of file/folder renames.

## 1.8.5-1-beta
- Fix #171 sub issue

## 1.8.5-0-beta
- Fix style issues with some plugins
- Fix #238

## 1.8.4-2-beta
Fix #125

## 1.8.4-1-beta
- Fix #129
- Also added a few other checking conditions to commands so that they don't show up anymore when you can't use them

## 1.8.4-0-beta
Fix #112

## 1.8.3-4-beta
Fix #223

## 1.8.3-1-beta
- Fix #168
- Fix hide/show folder note command in the file explorer
- Improve performance of mutation observer

## 1.8.2-1-beta
Fix #168

## 1.8.2-0-beta
Plugin performance tests.

## 1.8.1-3-beta
- Improve descriptions & titles in the settings tab
- Fix frontmatter title plugin issue

## 1.8.1-2-beta
Fix for #218

## 1.8.0-0-beta
- Option to disable persistent setting tab (after restart or after closing the settings)
- Fix description of front matter title plugin setting

Discord server for the plugin: https://discord.gg/4UQEDfQmuH

## 1.7.30-29-beta
Should fix #175

## 1.7.30-26-beta
- Folder overview up to date
- Fix applying templates & using templates without a plugin
- Option to automatically create folder note when you create a file
- Fix eslint issues

## 1.7.30-25-beta
Fix renaming of all folder notes who are in the parent folder previously it only worked for folder notes who are inside their parent folder.

## 1.7.30-24-beta
- Fix parent folder path storage option on first lvl

## 1.7.30-23-beta
Adds a option to change the old/new folder note name in the modal to rename all folder notes
Switching the folder note location (inside Folder or parent Folder) also requires a modal now

## 1.7.30-21-beta
Should fix #141, #136, #166
It also adds a modal to confirm if you really want to rename all existing folder notes.

## 1.7.30-19-beta
Testing some things, last beta release missed main.js

## 1.7.30-6-beta
Fix #148

## 1.7.30-5-beta
- Should fix #146

## 1.7.30-4-beta
- Should fix #145
