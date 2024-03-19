import { FileExplorerWorkspaceLeaf } from "src/globals";

export function getFileNameFromPathString(path: string): string {
    return path.substring(path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/' || '\\') + 1 : 0);
}

export function getFolderNameFromPathString(path: string): string {
    if (path.endsWith('.md') || path.endsWith('.canvas')) {
        return path.split('/').slice(-2)[0];
    } else {
        return path.split('/').slice(-1)[0];
    }
}

export function removeExtension(name: string): string {
    return name.replace(/\.[^/.]+$/, '');
}

export function getExtensionFromPathString(path: string): string {
    return path.slice(path.lastIndexOf('.') >= 0 ? path.lastIndexOf('.') : 0);
}

export function getFolderPathFromString(path: string): string {
    const subString = path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/') : 0;
    return path.substring(0, subString);
}

export function getParentFolderPath(path: string): string {
    return this.getFolderPathFromString(this.getFolderPathFromString(path));
}

export function getFileExplorer() {
    return this.app.workspace.getLeavesOfType('file-explorer')[0] as FileExplorerWorkspaceLeaf;
}

export function getFileExplorerView() {
    return this.getFileExplorer().view;
}
