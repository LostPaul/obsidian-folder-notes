import { addExcludeFolderListItem, addExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import { addExcludePatternListItem } from 'src/ExcludeFolders/functions/patternFunctions';
import { Setting } from 'obsidian';
import { SettingsTab } from './SettingsTab';
import ExcludedFolderSettings from 'src/ExcludeFolders/modals/ExcludeFolderSettings';
import PatternSettings from 'src/ExcludeFolders/modals/PatternSettings';
import WhitelistedFoldersSettings from 'src/ExcludeFolders/modals/WhitelistedFoldersSettings';
// import ExcludedFoldersWhitelist from 'src/ExcludeFolders/modals/WhitelistModal';

export async function renderExcludeFolders(settingsTab: SettingsTab) {
    const containerEl = settingsTab.settingsPage;
    const manageExcluded = new Setting(containerEl)
        .setHeading()
        .setClass('fn-excluded-folder-heading')
        .setName('Manage excluded folders');
    const desc3 = document.createDocumentFragment();
    desc3.append(
        'Add {regex} at the beginning of the folder name to use a regex pattern.',
        desc3.createEl('br'),
        'Use * before and after to exclude folders that include the name between the *s.',
        desc3.createEl('br'),
        'Use * before the folder name to exclude folders that end with the folder name.',
        desc3.createEl('br'),
        'Use * after the folder name to exclude folders that start with the folder name.',
    );
    manageExcluded.setDesc(desc3);
    manageExcluded.infoEl.appendText('The regexes and wildcards are only for the folder name, not the path.');
    manageExcluded.infoEl.createEl('br');
    manageExcluded.infoEl.appendText('If you want to switch to a folder path delete the pattern first.');
    manageExcluded.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';


    new Setting(containerEl)
        .setName('Whitelisted folders')
        .setDesc('Folders that override the excluded folders/patterns')
        .addButton((cb) => {
            cb.setButtonText('Manage')
            cb.setCta()
            cb.onClick(async () => {
                new WhitelistedFoldersSettings(settingsTab).open();
            })
        })

    new Setting(containerEl)
        .setName('Exclude folder default settings')
        .addButton((cb) => {
            cb.setButtonText('Manage')
            cb.setCta()
            cb.onClick(async () => {
                new ExcludedFolderSettings(settingsTab.app, settingsTab.plugin, settingsTab.plugin.settings.excludeFolderDefaultSettings).open();
            })
        })

    new Setting(containerEl)
        .setName('Exclude pattern default settings')
        .addButton((cb) => {
            cb.setButtonText('Manage')
            cb.setCta()
            cb.onClick(async () => {
                new PatternSettings(settingsTab.app, settingsTab.plugin, settingsTab.plugin.settings.excludePatternDefaultSettings).open();
            })
        })


    new Setting(containerEl)
        .setName('Add excluded folder')
        .setClass('add-exclude-folder-item')
        .addButton((cb) => {
            cb.setIcon('plus');
            cb.setClass('add-exclude-folder');
            cb.setTooltip('Add excluded folder');
            cb.onClick(() => {
                const excludedFolder = new ExcludedFolder('', settingsTab.plugin.settings.excludeFolders.length, undefined, settingsTab.plugin);
                addExcludeFolderListItem(settingsTab, containerEl, excludedFolder);
                addExcludedFolder(settingsTab.plugin, excludedFolder);
                settingsTab.display();
            });
        });

    settingsTab.plugin.settings.excludeFolders.filter((folder) => !folder.hideInSettings).sort((a, b) => a.position - b.position).forEach((excludedFolder) => {
        if (excludedFolder.string?.trim() !== '' && excludedFolder.path?.trim() === '') {
            addExcludePatternListItem(settingsTab, containerEl, excludedFolder);
        } else {
            addExcludeFolderListItem(settingsTab, containerEl, excludedFolder);
        }
    });
}