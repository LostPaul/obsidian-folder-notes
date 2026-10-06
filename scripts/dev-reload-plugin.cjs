const { Plugin } = require('obsidian');

// Installed only in generated development vaults, never in the released plugin.
module.exports = class FolderNotesDevReload extends Plugin {
	async onload() {
		this.stopped = false;
		this.reloading = false;
		this.markerPath = `${this.app.vault.configDir}/plugins/folder-notes/dev-build.json`;
		this.lastBuild = await this.readBuild();
		if (this.stopped) return;
		this.registerInterval(window.setInterval(() => { void this.checkBuild(); }, 500));
	}

	async readBuild() {
		try {
			return await this.app.vault.adapter.read(this.markerPath);
		} catch {
			return null;
		}
	}

	async checkBuild() {
		if (this.stopped || this.reloading) return;
		this.reloading = true;
		try {
			const build = await this.readBuild();
			if (this.stopped || !build || build === this.lastBuild) return;
			this.lastBuild = build;
			// Leave a plugin that the developer deliberately disabled alone.
			if (!this.app.plugins.getPlugin('folder-notes')) return;
			await this.app.plugins.disablePlugin('folder-notes');
			await this.app.plugins.enablePlugin('folder-notes');
		} catch (error) {
			console.error('Folder Notes development reload failed', error);
		} finally {
			this.reloading = false;
		}
	}

	onunload() {
		this.stopped = true;
	}
};
