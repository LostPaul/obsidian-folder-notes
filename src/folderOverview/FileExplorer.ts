import { MarkdownPostProcessorContext, parseYaml, TAbstractFile, TFolder, TFile, stringifyYaml, Notice, Menu } from 'obsidian';
import { getFolderNote } from '../functions/folderNoteFunctions';
import FolderNotesPlugin from '../main';
import { FolderOverviewSettings } from './ModalSettings';
import { getExcludedFolder } from '../ExcludeFolders/functions/folderFunctions';
import { getFolderPathFromString } from '../functions/utils';
import { getEl } from 'src/functions/styleFunctions';
import { FolderOverview, yamlSettings } from './FolderOverview';
import FolderNameModal from 'src/modals/FolderName';
import NewFolderNameModal from 'src/modals/NewFolderName';

export async function renderFileExplorer(plugin: FolderNotesPlugin, ctx: MarkdownPostProcessorContext, root: HTMLElement, yaml: yamlSettings, pathBlacklist: string[], folderOverview: FolderOverview) {
    const folder = getEl(yaml.folderPath)
    let folderElement = folder?.parentElement;
    const source = ctx.sourcePath;
    const overviewList = root.querySelector('ul.folder-overview-list') as HTMLElement;
    overviewList?.empty();
    if (!overviewList) return;


    let tFolder = plugin.app.vault.getAbstractFileByPath(yaml.folderPath);
    if (!tFolder && yaml.folderPath.trim() == '') {
        if (ctx.sourcePath.includes('/')) {
            tFolder = plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(ctx.sourcePath));
        } else {
            yaml.folderPath = '/';
            tFolder = plugin.app.vault.getAbstractFileByPath('/');
        }
    }

    if (!folderElement && !tFolder) return;

    folderElement = document.querySelector('div.nav-files-container') as HTMLElement;
    if (!folderElement) return;
    const newFolderElement = folderElement.cloneNode(true) as HTMLElement;
    newFolderElement.querySelectorAll('div.nav-folder-title ').forEach((el) => {
        const folder = plugin.app.vault.getAbstractFileByPath(el.getAttribute('data-path') || '');
        if (!(folder instanceof TFolder)) return;
        if (yaml.storeFolderCondition) {
            if (folder.collapsed) {
                el.classList.add('is-collapsed');
            } else {
                el.classList.remove('is-collapsed');
            }
        } else {
            if (el.parentElement?.classList.contains('is-collapsed')) {
                folder.collapsed = true;
            } else {
                folder.collapsed = false;
            }
        }
        if (el.classList.contains('has-folder-note')) {
            const folderNote = getFolderNote(plugin, folder.path);
            if (folderNote) { pathBlacklist.push(folderNote.path); }
        }
    });

    function handleVaultChange(eventType: string) {	
        renderFileExplorer(plugin, ctx, root, yaml, pathBlacklist, folderOverview);
        console.log(eventType);
    }

    plugin.app.vault.on('rename', () => handleVaultChange('renamed'));
    plugin.app.vault.on('create', () => handleVaultChange('created'));
    plugin.app.vault.on('delete', () => handleVaultChange('deleted'));


    if (tFolder instanceof TFolder && !yaml.folderPath.trim().includes('/')) {
        addFiles(tFolder.children, overviewList, folderOverview);
    } else if (yaml.folderPath.trim() === '/') {
        const rootFiles: TAbstractFile[] = [];
        if (yaml.includeTypes.includes('folder')) {
            plugin.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder).forEach((file) => {
                if (!file.path.includes('/')) {
                    rootFiles.push(file);
                }
            });
        } else {
            rootFiles.push(...plugin.app.vault.getAllLoadedFiles());
        }
        addFiles(rootFiles, overviewList, folderOverview);
    }

    newFolderElement.querySelectorAll('div.tree-item-icon').forEach((el) => {
        if (el instanceof HTMLElement) {
            el.onclick = () => {
                const path = el.parentElement?.getAttribute('data-path');
                if (!path) return;
                const folder = plugin.app.vault.getAbstractFileByPath(path);
                handleCollapseClick(el, plugin, yaml, pathBlacklist, source, folderOverview, folder);
            }
        }
    });
}

async function addFiles(files: TAbstractFile[], childrenElement: HTMLElement, folderOverview: FolderOverview) {
    const plugin = folderOverview.plugin;
    const pathBlacklist = folderOverview.pathBlacklist;
    const yaml = folderOverview.yaml;
    const folders = folderOverview.sortFiles(files.filter((file) => file instanceof TFolder));
    const filesWithoutFolders = folderOverview.sortFiles(files.filter((file) => !(file instanceof TFolder)));

    for (const child of folders) {
        if (child instanceof TFolder) {
            createFolderEL(plugin, child, folderOverview, childrenElement);
        }
    }

    for (const child of filesWithoutFolders) {
        if (child instanceof TFile) {
            if (pathBlacklist.includes(child.path) && !yaml.showFolderNotes) { continue; }
            const extension = child.extension.toLowerCase() == 'md' ? 'markdown' : child.extension.toLowerCase();
            const includeTypes = yaml.includeTypes;

            if (includeTypes.length > 0 && !includeTypes.includes('all')) {
                if ((extension === 'md' || extension === 'markdown') && !includeTypes.includes('markdown')) continue;
                if (extension === 'canvas' && !includeTypes.includes('canvas')) continue;
                if (extension === 'pdf' && !includeTypes.includes('pdf')) continue;
                const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
                if (imageTypes.includes(extension) && !includeTypes.includes('image')) continue;
                const videoTypes = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];
                if (videoTypes.includes(extension) && !includeTypes.includes('video')) continue;
                const audioTypes = ['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg', 'oga', 'opus'];
                if (audioTypes.includes(extension) && includeTypes.includes('audio')) continue;
                const allTypes = ['markdown', 'md', 'canvas', 'pdf', ...imageTypes, ...videoTypes, ...audioTypes];
                if (!allTypes.includes(extension) && !includeTypes.includes('other')) continue;
            }

            const fileElement = childrenElement.createDiv({
                cls: 'tree-item nav-file',
            });

            const fileTitle = fileElement.createDiv({
                cls: 'tree-item-self is-clickable nav-file-title pointer-cursor',
                attr: {
                    'data-path': child.path,
                    'draggable': 'true'
                },
            })

            fileTitle.onclick = () => {
                plugin.app.workspace.openLinkText(child.path, child.path, true);
            }

            fileTitle.oncontextmenu = (e) => {
                const fileMenu = new Menu();
                fileMenu.addSeparator();

                fileMenu.addItem((item) => {
                    item.setTitle('Rename');
                    item.setIcon('pencil');
                    item.onClick(async () => {
                        plugin.app.fileManager.promptForFileRename(child)
                    });
                });

                fileMenu.addItem((item) => {
                    item.setTitle('Delete');
                    item.setIcon('trash');
                    item.dom.addClass('is-warning');
                    item.dom.setAttribute('data-section', 'danger')
                    item.onClick(() => {
                        plugin.app.fileManager.promptForDeletion(child)
                    });
                });

                fileMenu.addSeparator();

                plugin.app.workspace.trigger('file-menu', fileMenu, child, "folder-overview-file-context-menu", null);
                fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
            }

            fileTitle.createDiv({
                cls: 'tree-item-inner nav-file-title-content',
                text: child.basename,
            });

            if (child.extension !== 'md' && !yaml.disableFileTag) {
                fileTitle.createDiv({
                    cls: 'nav-file-tag',
                    text: child.extension
                });
            }
        }
    }
}


function handleCollapseClick(el: HTMLElement, plugin: FolderNotesPlugin, yaml: yamlSettings, pathBlacklist: string[], sourcePath: string, folderOverview: FolderOverview, folder?: TFolder | undefined | null | TAbstractFile) {
    el.classList.toggle('is-collapsed');
    if (el.classList.contains('is-collapsed')) {
        if (!(folder instanceof TFolder)) return;
        folder.collapsed = true;
        el.parentElement?.parentElement?.childNodes[1]?.remove();
    } else {
        if (!(folder instanceof TFolder)) return;
        folder.collapsed = false;
        const folderElement = el.parentElement?.parentElement;
        if (!folderElement) return;
        const childrenElement = folderElement.createDiv({ cls: 'tree-item-children nav-folder-children' });
        let files = folderOverview.sortFiles(folder.children);
        files = folderOverview.filterFiles(files, plugin, folder.path, yaml.depth || 1, pathBlacklist);
        addFiles(files, childrenElement, folderOverview);
    }
}

function createFolderEL(plugin: FolderNotesPlugin, child: TFolder, folderOverview: FolderOverview, childrenElement: HTMLElement) {
    const pathBlacklist = folderOverview.pathBlacklist;
    const source = folderOverview.source;
    const folderNote = getFolderNote(plugin, child.path);
    const yaml = folderOverview.yaml;
    let folderTitle: HTMLElement | null = null;
    let folderElement: HTMLElement | null = null;

    if (folderNote) { pathBlacklist.push(folderNote.path); }
    const excludedFolder = getExcludedFolder(plugin, child.path, true);
    if (excludedFolder?.excludeFromFolderOverview) { return; }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg>';
    if (yaml.includeTypes.includes('folder')) {
        folderElement = childrenElement.createDiv({
            cls: 'tree-item nav-folder',
        });
        folderTitle = folderElement.createDiv({
            cls: 'tree-item-self is-clickable nav-folder-title',
            attr: {
                'data-path': child.path,
                'draggable': 'true'
            },
        })

        folderTitle.oncontextmenu = (e) => {
            const fileMenu = new Menu();
            fileMenu.addSeparator();

            fileMenu.addItem((item) => {
                item.setTitle('Rename');
                item.setIcon('pencil');
                item.onClick(async () => {
                    console.log('child', child)
                    new NewFolderNameModal(plugin.app, plugin, child).open();
                });
            });

            fileMenu.addItem((item) => {
                item.setTitle('Delete');
                item.setIcon('trash');
                item.dom.addClass('is-warning');
                item.dom.setAttribute('data-section', 'danger')
                item.onClick(() => {
                    plugin.app.fileManager.promptForFolderDeletion(child)
                });
            });

            fileMenu.addSeparator();

            plugin.app.workspace.trigger('file-menu', fileMenu, child, "folder-overview-file-context-menu", null);
            fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
        }
    }

    if (!child.collapsed) {
        if (yaml.includeTypes.includes('folder')) {
            folderTitle?.classList.remove('is-collapsed');
            const childrenElement = folderElement?.createDiv({ cls: 'tree-item-children nav-folder-children' });
            if (childrenElement) {
                addFiles(child.children, childrenElement, folderOverview);
            }
        } else {
            addFiles(child.children, childrenElement, folderOverview);
        }
    } else {
        folderTitle?.classList.add('is-collapsed');
    }
    if (folderNote) { folderTitle?.classList.add('has-folder-note') }
    if (folderNote && child.children.length === 1 && yaml.disableCollapseIcon) { folderTitle?.classList.add('fn-has-no-files') }

    const collapseIcon = folderTitle?.createDiv({
        cls: 'tree-item-icon collapse-icon nav-folder-collapse-indicator fn-folder-overview-collapse-icon',
    });

    if (child.collapsed) {
        collapseIcon?.classList.add('is-collapsed');
    }
    if (collapseIcon) {
        collapseIcon.innerHTML = svg;
        collapseIcon.onclick = () => {
            handleCollapseClick(collapseIcon, plugin, yaml, pathBlacklist, source, folderOverview, child);
        }
    }

    folderTitle?.createDiv({
        cls: 'tree-item-inner nav-folder-title-content',
        text: child.name,
    });
}