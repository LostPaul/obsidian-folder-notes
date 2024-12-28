import { MarkdownPostProcessorContext, TFolder, TFile } from 'obsidian';
import { getFolderNote } from '../functions/folderNoteFunctions';
import FolderNotesPlugin from '../main';
import { FolderOverview, yamlSettings } from './FolderOverview';

export function renderListOverview(plugin: FolderNotesPlugin, ctx: MarkdownPostProcessorContext, root: HTMLElement, yaml: yamlSettings, pathBlacklist: string[], folderOverview: FolderOverview) {
    if (!folderOverview.sourceFolder) { return; }
    let files = folderOverview.sourceFolder.children;
    if (!files) { return; }
    const ul = folderOverview.listEl;
    const sourceFolderPath = folderOverview.sourceFolder.path;


    const folders = folderOverview.sortFiles(files.filter(f => f instanceof TFolder));
    files = folderOverview.sortFiles(files.filter(f => f instanceof TFile));
    folders.forEach((file) => {
        if (file instanceof TFolder) {
            const folderItem = addFolderList(plugin, ul, folderOverview.pathBlacklist, file, folderOverview);
            if (!folderItem) { return; }
            goThroughFolders(plugin, folderItem, file, folderOverview.yaml.depth, sourceFolderPath, ctx, folderOverview.yaml, folderOverview.pathBlacklist, folderOverview.yaml.includeTypes, folderOverview.yaml.disableFileTag, folderOverview);
        }
    });
    files.forEach((file) => {
        if (file instanceof TFile) {
            addFileList(plugin, ul, folderOverview.pathBlacklist, file, folderOverview.yaml.includeTypes, folderOverview.yaml.disableFileTag, folderOverview);
        }
    });
}

export function addFolderList(plugin: FolderNotesPlugin, list: HTMLUListElement | HTMLLIElement, pathBlacklist: string[], folder: TFolder, folderOverview: FolderOverview) {
    const folderItem = list.createEl('li', { cls: 'folder-overview-list folder-list' });
    const folderNote = getFolderNote(plugin, folder.path);
    if (folderNote instanceof TFile) {
        const folderNoteLink = folderItem.createEl('a', { cls: 'folder-overview-list-item folder-name-item internal-link', href: folderNote.path });
        folderNoteLink.innerText = folder.name;
        pathBlacklist.push(folderNote.path);
        folderNoteLink.oncontextmenu = (e) => {
            e.stopImmediatePropagation();
            folderOverview.fileMenu(folderNote, e);
        }
    } else {
        const folderName = folderItem.createEl('span', { cls: 'folder-overview-list-item folder-name-item' });
        folderName.innerText = folder.name;
        folderName.oncontextmenu = (e) => {
            folderOverview.folderMenu(folder, e);
        }
    }
    return folderItem;
}

function goThroughFolders(plugin: FolderNotesPlugin, list: HTMLLIElement | HTMLUListElement, folder: TFolder,
    depth: number, sourceFolderPath: string, ctx: MarkdownPostProcessorContext, yaml: yamlSettings,
    pathBlacklist: string[], includeTypes: string[], disableFileTag: boolean, folderOverview: FolderOverview) {
    if (sourceFolderPath === '') {
        depth--;
    }

    let allFiles = folderOverview.filterFiles(folder.children, plugin, sourceFolderPath, depth, pathBlacklist);
    const files = folderOverview.sortFiles(allFiles.filter((file) => !(file instanceof TFolder)));

    const folders = folderOverview.sortFiles(allFiles.filter((file) => file instanceof TFolder));
    const ul = list.createEl('ul', { cls: 'folder-overview-list' });
    folders.forEach((file) => {
        if (file instanceof TFolder) {
            const folderItem = addFolderList(plugin, ul, pathBlacklist, file, folderOverview);
            if (!folderItem) return;
            goThroughFolders(plugin, folderItem, file, depth, sourceFolderPath, ctx, yaml, pathBlacklist, includeTypes, disableFileTag, folderOverview);
        }
    });
    files.forEach((file) => {
        if (file instanceof TFile) {
            addFileList(plugin, ul, pathBlacklist, file, includeTypes, disableFileTag, folderOverview);
        }
    });
}

function addFileList(plugin: FolderNotesPlugin, list: HTMLUListElement | HTMLLIElement, pathBlacklist: string[], file: TFile, includeTypes: string[], disableFileTag: boolean, folderOverview: FolderOverview) {
    if (includeTypes.length > 0 && !includeTypes.includes('all')) {
        if (file.extension === 'md' && !includeTypes.includes('markdown')) return;
        if (file.extension === 'canvas' && !includeTypes.includes('canvas')) return;
        if (file.extension === 'pdf' && !includeTypes.includes('pdf')) return;
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
        if (imageTypes.includes(file.extension) && !includeTypes.includes('image')) return;
        const videoTypes = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];
        if (videoTypes.includes(file.extension) && !includeTypes.includes('video')) return;
        const audioTypes = ['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg', 'oga', 'opus'];
        if (audioTypes.includes(file.extension) && includeTypes.includes('audio')) return;
        const allTypes = ['md', 'canvas', 'pdf', ...imageTypes, ...videoTypes, ...audioTypes];
        if (!allTypes.includes(file.extension) && !includeTypes.includes('other')) return;
    }
    if (!folderOverview.yaml.showFolderNotes) {
        if (pathBlacklist.includes(file.path)) return;
    }
    const listItem = list.createEl('li', { cls: 'folder-overview-list file-link' });
    listItem.oncontextmenu = (e) => {
        e.stopImmediatePropagation();
        folderOverview.fileMenu(file, e);
    }
    const nameItem = listItem.createEl('div', { cls: 'folder-overview-list-item' });
    const link = nameItem.createEl('a', { cls: 'internal-link', href: file.path });
    link.innerText = file.basename;
    if (file.extension !== 'md' && !disableFileTag) {
        nameItem.createDiv({ cls: 'nav-file-tag' }).innerText = file.extension;
    }
}