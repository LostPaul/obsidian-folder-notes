export function getFolderPathFromString(path: string): string {
    const subString = path.lastIndexOf('/') >= 0 ? path.lastIndexOf('/') : 0;
    const folderPath = path.substring(0, subString);
    if (folderPath === '') {
        return '/';
    } else {
        return folderPath;
    }
}