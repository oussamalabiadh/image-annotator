import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Image {
  constructor(private http: HttpClient) {}

  // Générer la liste des images (1.png à 152.png)
  getImages(): Observable<{ images: string[] }> {
    const images = Array.from({ length: 152 }, (_, i) => `${i + 1}.png`);
    return of({ images });
  }

  // Simuler la sauvegarde des annotations
  saveAnnotations(annotations: any): Observable<any> {
    console.log('Sauvegarde des annotations:', annotations);
    return of({ status: 'success' });
  }
}