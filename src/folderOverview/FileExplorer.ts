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

export class FileExplorerOverview {
    plugin: FolderNotesPlugin;
    folderOverview: FolderOverview;
    pathBlacklist: string[];
    source: string;
    yaml: yamlSettings;
    root: HTMLElement;

    eventListeners: (() => void)[] = [];
    constructor(plugin: FolderNotesPlugin, ctx: MarkdownPostProcessorContext, root: HTMLElement, yaml: yamlSettings, pathBlacklist: string[], folderOverview: FolderOverview) {
        this.plugin = plugin;
        this.folderOverview = folderOverview;
        this.pathBlacklist = pathBlacklist;
        this.source = ctx.sourcePath;
        this.yaml = yaml;
        this.root = root;
    }

    disconnectListeners() {
        this.eventListeners.forEach((unregister) => {
            unregister();
        });
        this.eventListeners = [];
    }

    async renderFileExplorer() {
        this.disconnectListeners();
        const plugin = this.plugin;
        const ctx = this.folderOverview.ctx;
        const root = this.folderOverview.root;
        const yaml = this.folderOverview.yaml;
        const folderOverview = this.folderOverview;
        const folder = getEl(yaml.folderPath, plugin);
        let folderElement = folder?.parentElement;
        const source = ctx.sourcePath;
        const overviewList = folderOverview.listEl;
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
        // wait until the file explorer is loaded


        folderElement = document.querySelectorAll('.nav-files-container')[0] as HTMLElement;
        if (!folderElement) return;
        
        const newFolderElement = folderElement.cloneNode(true) as HTMLElement;

        newFolderElement.querySelectorAll('div.nav-folder-title').forEach((el) => {
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
                if (folderNote) { folderOverview.pathBlacklist.push(folderNote.path); }
            }
        });

        const debouncedRenderFileExplorer = this.debounce(() => this.renderFileExplorer(), 300);

        const handleVaultChange = () => {
            debouncedRenderFileExplorer();
        }

        this.eventListeners.push(() => {
            folderOverview.off('vault-change', handleVaultChange);
        });

        folderOverview.on('vault-change', handleVaultChange);

        if (tFolder instanceof TFolder) {
            this.addFiles(tFolder.children, overviewList, folderOverview);
        }

        newFolderElement.querySelectorAll('div.tree-item-icon').forEach((el) => {
            if (el instanceof HTMLElement) {
                el.onclick = () => {
                    const path = el.parentElement?.getAttribute('data-path');
                    if (!path) return;
                    const folder = plugin.app.vault.getAbstractFileByPath(path);
                    this.handleCollapseClick(el, plugin, yaml, this.pathBlacklist, source, folderOverview, folder);
                }
            }
        });
    }

    debounce(func: Function, wait: number) {
        let timeout: number | undefined;
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => func.apply(this, args), wait);
        };
    }

    addFiles(files: TAbstractFile[], childrenElement: HTMLElement, folderOverview: FolderOverview) {
        const plugin = folderOverview.plugin;
        const pathBlacklist = folderOverview.pathBlacklist;
        const yaml = folderOverview.yaml;
        const folders = folderOverview.sortFiles(files.filter((file) => file instanceof TFolder));
        const filesWithoutFolders = folderOverview.sortFiles(files.filter((file) => !(file instanceof TFolder)));

        for (const child of folders) {
            if (child instanceof TFolder) {
                this.createFolderEL(plugin, child, folderOverview, childrenElement);
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

                fileTitle.addEventListener('dragover', e => {
                    e.preventDefault();
                    const { draggable } = plugin.app.dragManager;
                    if (draggable && draggable.file instanceof TFolder) {
                        plugin.app.dragManager.setAction(window.i18next.t("interface.drag-and-drop.move-into-folder", { folder: child.parent?.name || '' }));
                        const folderEL = folderOverview.getElFromOverview(child.parent?.path || '')
                        if (folderEL) {
                            folderEL.parentElement?.classList.add('is-being-dragged-over');
                        }
                    }
                });

                fileTitle.addEventListener('dragleave', e => {
                    const folderEL = folderOverview.getElFromOverview(child.parent?.path || '')
                    if (folderEL) {
                        folderEL.parentElement?.classList.remove('is-being-dragged-over');
                    }
                });

                fileTitle.addEventListener('drop', e => {
                    const { draggable } = plugin.app.dragManager;
                    if (draggable && draggable.file instanceof TFolder) {
                        plugin.app.fileManager.renameFile(draggable.file, child.parent?.path + '/' + draggable.file.name);
                    }
                });

                fileTitle.onclick = () => {
                    plugin.app.workspace.openLinkText(child.path, child.path, true);
                }

                fileTitle.oncontextmenu = (e) => {
                    folderOverview.fileMenu(child, e);
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

    handleCollapseClick(el: HTMLElement, plugin: FolderNotesPlugin, yaml: yamlSettings, pathBlacklist: string[], sourcePath: string, folderOverview: FolderOverview, folder?: TFolder | undefined | null | TAbstractFile) {
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
            this.addFiles(files, childrenElement, folderOverview);
        }
    }

    async createFolderEL(plugin: FolderNotesPlugin, child: TFolder, folderOverview: FolderOverview, childrenElement: HTMLElement) {
        const pathBlacklist = folderOverview.pathBlacklist;
        const source = folderOverview.source;
        const folderNote = getFolderNote(plugin, child.path);
        const yaml = folderOverview.yaml;
        let folderTitle: HTMLElement | null = null;
        let folderElement: HTMLElement | null = null;

        if (folderNote) { pathBlacklist.push(folderNote.path); }
        const excludedFolder = await getExcludedFolder(plugin, child.path, true);
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

            folderTitle.draggable = true;
            folderTitle.addEventListener('dragstart', e => {
                const dragManager = plugin.app.dragManager;
                const dragData = dragManager.dragFolder(e, child);
                dragManager.onDragStart(e, dragData);
                folderTitle?.classList.add('is-being-dragged');
            });

            folderTitle.addEventListener('dragend', e => {
                folderTitle?.classList.remove('is-being-dragged');
            });

            folderTitle.addEventListener('dragover', e => {
                e.preventDefault();
                const { draggable } = plugin.app.dragManager;
                if (draggable && draggable.file instanceof TFolder) {
                    folderElement?.classList.add('is-being-dragged-over');
                    plugin.app.dragManager.setAction(window.i18next.t("interface.drag-and-drop.move-into-folder", { folder: child.name }));
                }
            });

            folderTitle.addEventListener('dragleave', e => {
                folderElement?.classList.remove('is-being-dragged-over');
            });

            // handle the drop event
            folderTitle.addEventListener('drop', e => {
                const { draggable } = plugin.app.dragManager;
                if (draggable && draggable.file instanceof TFolder) {
                    plugin.app.fileManager.renameFile(draggable.file, child.path + '/' + draggable.file.name);
                }
            });

            folderTitle.oncontextmenu = (e) => {
                folderOverview.folderMenu(child, e);
            }
        }

        if (!child.collapsed) {
            if (yaml.includeTypes.includes('folder')) {
                folderTitle?.classList.remove('is-collapsed');
                const childrenElement = folderElement?.createDiv({ cls: 'tree-item-children nav-folder-children' });
                if (childrenElement) {
                    this.addFiles(child.children, childrenElement, folderOverview);
                }
            } else {
                this.addFiles(child.children, childrenElement, folderOverview);
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
                this.handleCollapseClick(collapseIcon, plugin, yaml, pathBlacklist, source, folderOverview, child);
            }
        }

        const folderTitleText = folderTitle?.createDiv({
            cls: 'tree-item-inner nav-folder-title-content',
            text: child.name,
        });

        if (folderTitleText && !folderNote) {
            folderTitleText.onclick = () => {
                const collapseIcon = folderTitle?.querySelectorAll('.tree-item-icon')[0] as HTMLElement;
                if (collapseIcon) {
                    this.handleCollapseClick(collapseIcon, plugin, yaml, pathBlacklist, source, folderOverview, child);
                }
            }
        }
    }
}