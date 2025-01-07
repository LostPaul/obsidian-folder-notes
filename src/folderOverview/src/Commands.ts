import FolderOverviewPlugin from './main';

export function registerCommands(plugin: FolderOverviewPlugin) {
    plugin.addCommand({
        id: 'open-folder-overview-settings',
        name: 'Open Folder Overview settings',
        callback: () => {
            plugin.activateOverviewView();
        }
    });
}