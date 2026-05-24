import { Tray, Menu, nativeImage, type BrowserWindow } from 'electron';

export class PecsTray {
  private tray: Tray | null = null;

  create(win: BrowserWindow, port: number): void {
    // Minimal 16x16 RGBA icon — a solid teal square
    const size = 16;
    const rgba = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      rgba[i * 4] = 0x2d;     // R
      rgba[i * 4 + 1] = 0x9c; // G
      rgba[i * 4 + 2] = 0xde; // B
      rgba[i * 4 + 3] = 0xff; // A (fully opaque)
    }
    const icon = nativeImage.createFromBuffer(rgba, { width: size, height: size });

    this.tray = new Tray(icon);
    this.tray.setToolTip(`PECS Desktop — API on :${port}`);

    const menu = Menu.buildFromTemplate([
      { label: 'PECS — Personal Engineering Cognition System', enabled: false },
      { type: 'separator' },
      { label: 'Show Window', click: () => { win.show(); win.focus(); } },
      { label: `API: http://localhost:${port}`, enabled: false },
      { type: 'separator' },
      { label: 'Quit PECS', click: () => { win.destroy(); this.destroy(); } },
    ]);

    this.tray.setContextMenu(menu);
    this.tray.on('click', () => {
      win.isVisible() ? win.hide() : (win.show(), win.focus());
    });
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
