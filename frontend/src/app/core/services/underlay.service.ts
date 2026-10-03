import { Injectable, inject, signal } from '@angular/core';
import { ProjectStore } from '../state/project-store.service';
import { UNDERLAY_ACCEPT, validateUnderlay } from '../util/image-upload.util';

/** Loads a blueprint underlay image after checking its size and real file type. */
@Injectable({ providedIn: 'root' })
export class UnderlayService {
  private readonly store = inject(ProjectStore);

  readonly accept = UNDERLAY_ACCEPT;
  readonly error = signal<string | null>(null);

  async handleInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.load(file);
  }

  async load(file: File): Promise<void> {
    this.error.set(null);
    try {
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const check = validateUnderlay(file.size, head);
      if (!check.ok) {
        this.error.set(check.reason);
        return;
      }
      const dataUrl = await this.readAsDataUrl(file);
      // Rebuild the URL with the type detected from the bytes, not the type the browser reported.
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      this.store.setBackgroundImage(`data:${check.mime};base64,${base64}`);
    } catch {
      this.error.set('The image could not be read.');
    }
  }

  private readAsDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
