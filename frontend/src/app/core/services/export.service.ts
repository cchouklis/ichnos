import { Injectable, inject } from '@angular/core';
import { ProjectStore } from '../state/project-store.service';
import { typeById } from '../data/component-types.data';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly store = inject(ProjectStore);

  private sanitizeFilename(name: string): string {
    return (
      name
        .trim()
        .replace(/[^a-z0-9\-_ ]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase() || 'project'
    );
  }

  private download(content: BlobPart, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 400);
  }

  exportJson(): void {
    const dto = this.store.toProjectDto();
    const payload = { ...dto, exportedAt: new Date().toISOString() };
    this.download(JSON.stringify(payload, null, 2), `${this.sanitizeFilename(this.store.projectName())}.json`, 'application/json');
  }

  exportMaterialsCsv(): void {
    const counts = new Map<string, number>();
    for (const c of this.store.components()) {
      counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
    }
    let csv = 'Component,Quantity,Voltage,Amperage\n';
    for (const [typeId, qty] of counts) {
      const t = typeById(typeId);
      csv += `"${t.label}",${qty},${t.volts}V,${t.amps}A\n`;
    }
    this.download(csv, `${this.sanitizeFilename(this.store.projectName())}-materials.csv`, 'text/csv');
  }

  exportPlanPng(svgEl: SVGSVGElement): void {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const rect = svgEl.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0c1526';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.sanitizeFilename(this.store.projectName())}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          a.remove();
        }, 400);
      });
    };
    img.src = 'data:image/svg+xml;base64,' + svg64;
  }
}
