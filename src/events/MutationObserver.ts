import FolderNotesPlugin from 'src/main';
import { Platform, Keymap } from 'obsidian';
import { getFolderNote } from 'src/functions/folderNoteFunctions';
import { handleFolderClick, handleViewHeaderClick } from './handleClick';

export function addObserver(plugin: FolderNotesPlugin) {
    plugin.observer = new MutationObserver((mutations: MutationRecord[]) => {
        mutations.forEach((rec) => {
            if (rec.type === 'childList') {
                (<Element>rec.target).querySelectorAll('div.nav-folder-title-content')
                    .forEach((element: HTMLElement) => {
                        if (element.onclick) return;
                        if (Platform.isMobile && this.settings.disableOpenFolderNoteOnClick) return;
                        // handle middle click
                        element.addEventListener('auxclick', (event: MouseEvent) => {
                            if (event.button == 1) {
                                handleFolderClick(event, this)
                            }
                        }, { capture: true });
                        element.onclick = (event: MouseEvent) => handleFolderClick(event, this);
                        this.registerDomEvent(element, 'pointerover', (event: MouseEvent) => {
                            this.hoveredElement = element;
                            this.mouseEvent = event;
                            if (!Keymap.isModEvent(event)) return;
                            if (!(event.target instanceof HTMLElement)) return;

                            const folderPath = event?.target?.parentElement?.getAttribute('data-path') || '';
                            const folderNote = getFolderNote(this, folderPath);
                            if (!folderNote) return;

                            this.app.workspace.trigger('hover-link', {
                                event: event,
                                source: 'preview',
                                hoverParent: {
                                    file: folderNote,
                                },
                                targetEl: event.target,
                                linktext: folderNote?.basename,
                                sourcePath: folderNote?.path,
                            });
                            this.hoverLinkTriggered = true;
                        });
                        this.registerDomEvent(element, 'pointerout', () => {
                            this.hoveredElement = null;
                            this.mouseEvent = null;
                            this.hoverLinkTriggered = false;
                        });
                    });
                if (!this.settings.openFolderNoteOnClickInPath) { return; }
                (<Element>rec.target).querySelectorAll('span.view-header-breadcrumb')
                    .forEach((element: HTMLElement) => {
                        const breadcrumbs = element.parentElement?.querySelectorAll('span.view-header-breadcrumb');
                        if (!breadcrumbs) return;
                        let path = '';
                        breadcrumbs.forEach((breadcrumb: HTMLElement) => {
                            if (breadcrumb.hasAttribute('old-name')) {
                                path += breadcrumb.getAttribute('old-name') + '/';
                            } else {
                                path += breadcrumb.innerText.trim() + '/';
                            }
                            const folderPath = path.slice(0, -1);
                            breadcrumb.setAttribute('data-path', folderPath);
                            const folder = this.fmtpHandler?.modifiedFolders.get(folderPath);
                            if (folder && this.settings.frontMatterTitle.path && this.settings.frontMatterTitle.enabled) {
                                breadcrumb.setAttribute('old-name', folder.name || '');
                                breadcrumb.innerText = folder.newName || '';
                            }
                            const folderNote = getFolderNote(this, folderPath);
                            if (folderNote) {
                                breadcrumb.classList.add('has-folder-note');
                            }
                        });
                        element.parentElement?.setAttribute('data-path', path.slice(0, -1));
                        if (breadcrumbs.length > 0) {
                            breadcrumbs.forEach((breadcrumb: HTMLElement) => {
                                if (breadcrumb.onclick) return;
                                breadcrumb.onclick = (event: MouseEvent) => handleViewHeaderClick(event, this);
                            });
                        }
                    });
            }
        });
    });
}