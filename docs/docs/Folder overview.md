# Folder overview
[The folder overview feature can be installed as a standalone plugin and works without the folder notes plugin by clicking on this.](https://obsidian.md/plugins?id=folder-overview)
**Don't install "folder notes" & the "folder overview" plugin instead only install the folder notes plugin otherwise you can't enable both and there can be other bugs.**

This feature/plugin creates a [code block](https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax#Code+blocks) that provides an overview of your entire vault or specific folders. Instructions for creating or editing a folder overview, along with additional guidance, can be found further down the page.
Currently there are two styles available: **file explorer** & **list style**, with more coming soon. The **overview updates** itself **automatically** when you create, delete or modify a file. You can also integrate it into **templates**, as explained further down below this page.

Additionally, you can **customize** the overview by selecting **specific file types**, adjusting **file depth**, and changing the **file order** (e.g., alphabetical: A-Z).
## Create overview 
There are two options to create a folder overview in a note

- Use the command "Insert folder overview" from the [command palette](https://help.obsidian.md/Plugins/Command+palette)
- On desktop right click and click on the option "Insert folder overview"
## Edit overview
If the overview shows no files or folders yet you can just click on the button that says "Edit overview". But if there are already files/folders you can use the command "Edit folder overview" from the [command palette](https://help.obsidian.md/Plugins/Command+palette) or click on the button as showed in the video below.

![type:video](../assets/n5AGi3VCxF5JcNx2Wm5O.mp4)

## Default settings
To edit the default values for new folder overviews you can either use the command "Edit folder overview" or open the plugins settings tab and then the folder overview tab to the edit the default settings. This won't change the settings of already existing folder overviews.


![Screenshot](../assets/screenshots/b4QOtkzJs0.png)
(On the left is the plugin settings tab and the right the view you see when you use the "Edit folder overview" command)

## FAQ
### How can I use this in a template?

Just create the folder overview as normal in a template and then change the settings to be what you want to use as a default for the files you apply the templates to. It also doesn't matter that the id of the overview in the template will be the same as the id of the overview that gets created when the template has been used.

### What's the id in the code block for?
They're there to differentiate the overviews from each other so that you can use "Edit folder overview" command to edit the overviews from one file (there can be multiple overviews in one file). It's especially useful on mobile because the button to edit the code block on mobile is quite small.

## How can I make the links appear in the graph view?
[Edit the folder overview](#edit-overview) and then enable "Use actual links" to let the links appear in the graph view. The file will be then edited under the code block and there will be another list added which is hidden by default. You can choose to either hide the code block or the list under it in the folder overview settings. The list of links under the code block will also be visible in other apps that support markdown.

![Screenshot](../assets/screenshots/Obsidian_nAqAIrlZFW.png)
![Screenshot](../assets/screenshots/P7yvNZmF5e.png)

## Settings

### Auto sync
When this is enabled and you rename/create/delete a file/folder which is a children of the selected folder the overview will automatically update.
### Title
The title is above the overview when you enable "Show the title". You can use variables like this: {{variableName}} which will be replaced with something and the list of variables you can use is below this text.

| Variable            | Explanation                                                                                                         | Example                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| folderName          | The name of the folder depending on what folder you choose to display                                               | Folder1                                                        |
| folderPath          | The path of the choosen folder                                                                                      | Folder1/Folder2                                                |
| fileName            | The name of the file where the overview is located in                                                               | File1                                                          |
| filePath            | The path of the file where the overview is located in                                                               | Folder1/File1                                                  |
| fmtpFileName        | The changed file name using the [front matter title plugin](https://github.com/snezhig/obsidian-front-matter-title) | Real file name: 1234, changed name: File1                      |
| properties.\<name\> | Choose any property from a file                                                                                     | properties.name => File1<br>properties.date => e.g. 01.01.2001 |
### Folder path
The overview will show the children of the selected folder.

When you leave the path empty it will use the parent folder of where the overview is located in. The same is true for "File's parent folder path". If you're using the folder notes plugin and have the storage location set to parent folder you'll need to use "Path of folder linked to the file" to show the children of the folder which is linked to the file. Otherwise if you would for example have the overview located in "File1" which is linked to "Folder1" it would choose all the files/folders of the vault.

### Use actual links
This allows the links of the overview to show up in the grap view, see [How can I make the links appear in the graph view?](#how-can-i-make-the-links-appear-in-the-graph-view?).

#### Hide link list/folder overview
Either hide the code block or the list under it. When you hide the link list every list item will have a span item added to it. It looks like on the image at [How can I make the links appear in the graph view?](#how-can-i-make-the-links-appear-in-the-graph-view?).

### Include types
Only the file types which are selected here will show up in the overview.

### Show folder notes
Show the file itself which is linked to one folder.

### File depth
Limit the depth of files/folders which are shown in the overview. When it is at depth one only the first level files/folders will be shown. When you can't see the childrens of folder the name won't be shown except when you enable ["Show folder names of folders that appear empty in the folder overview"](#show-folder-names-of-folders-that-appear-empty-in-the-folder-overview) or the folder has a file linked to it.

### Sort files by
Choose the order of files and folders.

### Show folder names of folders that appear empty in the folder overview
When folders don't have any childrens they don't show up until you enable this setting but they also don't show up until you set the "File depth" setting until the level of the children of a folder. For example you can see "Folder1" at level 2 and their children at level 3 and the folder name gets shown at level 3 or when you enable this setting.