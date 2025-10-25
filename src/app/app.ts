import { Component, ViewChild, ElementRef, OnInit, signal } from '@angular/core';
import { Image as ImageService } from './services/image';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
currentImgElement!: HTMLImageElement;
images = signal<{ name: string; status: string }[]>([]);
  currentImage: string = '';
  annotations: { [key: string]: any[] } = {};

  isDrawing = false;
  startX = 0;
  startY = 0;

  imageWidth = 0;  // taille réelle image
  imageHeight = 0; // taille réelle image

  loading =signal(false) ;

  constructor(private imageService: ImageService) {}

  ngOnInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.loadImageList();
      this.loadFromLocalStorage();

  }
drawImage() {
  if (!this.currentImage) return;

  this.loading.set(true);

  this.currentImgElement = new Image();
  this.currentImgElement.src = `/image-annotator/assets/object/${this.currentImage}`;
  this.currentImgElement.onload = () => {
    this.imageWidth = this.currentImgElement.width;
    this.imageHeight = this.currentImgElement.height;

    // Adapter canvas
    this.canvasRef.nativeElement.width = this.imageWidth;
    this.canvasRef.nativeElement.height = this.imageHeight;

    // Dessiner image + annotations existantes
    this.redrawCanvas();

    this.loading.set(false);
  };
}

redrawCanvas(tempRect?: { x: number; y: number; width: number; height: number }) {
  if (!this.currentImgElement) return;

  this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
  this.ctx.drawImage(this.currentImgElement, 0, 0);

  // Dessiner annotations existantes
  if (this.annotations[this.currentImage]) {
    const scaleX = this.canvasRef.nativeElement.width / this.imageWidth;
    const scaleY = this.canvasRef.nativeElement.height / this.imageHeight;

    this.annotations[this.currentImage].forEach(ann => {
      this.ctx.strokeStyle = 'blue';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(ann.x / scaleX, ann.y / scaleY, ann.width / scaleX, ann.height / scaleY);

      this.ctx.fillStyle = 'blue';
      this.ctx.font = '16px Arial';
      this.ctx.fillText(ann.title.fr, ann.x / scaleX, ann.y / scaleY - 5);
    });
  }

  // Dessiner rectangle temporaire si présent
  if (tempRect) {
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(tempRect.x, tempRect.y, tempRect.width, tempRect.height);
  }
}

draw(event: MouseEvent) {
  if (!this.isDrawing || !this.currentImage) return;

  const rect = this.canvasRef.nativeElement.getBoundingClientRect();
  const scaleX = this.canvasRef.nativeElement.width / rect.width;
  const scaleY = this.canvasRef.nativeElement.height / rect.height;

  const currentX = (event.clientX - rect.left) * scaleX;
  const currentY = (event.clientY - rect.top) * scaleY;

  const width = currentX - this.startX;
  const height = currentY - this.startY;

  this.redrawCanvas({ x: this.startX, y: this.startY, width, height });
}

stopDrawing(event: MouseEvent) {
  if (!this.isDrawing || !this.currentImage) return;
  this.isDrawing = false;

  const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width;
  const scaleY = this.canvasRef.nativeElement.height / rect.height;
 const endX = (event.clientX - rect.left) * scaleX;
  const endY = (event.clientY - rect.top) * scaleY;

  const width = endX - this.startX;
  const height = endY - this.startY;

  const titleFr = prompt('Entrez le titre en français :');
  const titleEn = prompt('Entrez le titre en anglais :');
  const titleAr = prompt('Entrez le titre en arabe :');

  if (titleFr && titleEn && titleAr) {
    const scaleX = this.imageWidth / this.canvasRef.nativeElement.width;
    const scaleY = this.imageHeight / this.canvasRef.nativeElement.height;

    const annotation = {
      x: this.startX * scaleX,
      y: this.startY * scaleY,
      width: width * scaleX,
      height: height * scaleY,
      title: { fr: titleFr, en: titleEn, ar: titleAr }
    };

    if (!this.annotations[this.currentImage]) this.annotations[this.currentImage] = [];
    this.annotations[this.currentImage].push(annotation);

    console.log('Image :', this.currentImage);
    console.log('Annotations :', this.annotations[this.currentImage]);

    this.redrawCanvas();
    this.saveToLocalStorage();

    this.saveAnnotations();
  }
}
  loadImageList() {
this.imageService.getImages().subscribe((data) => {
  this.images.set(data.images.map((name) => ({ name, status: 'non terminé' })));
  this.loadRandomImage();
});
  }

  selectImage(image: { name: string; status: string }) {
    this.currentImage = image.name;
    this.drawImage();
  }

loadRandomImage() {
  const imgs = this.images(); // récupérer le tableau du signal
  if (imgs.length === 0) return;

  const randomIndex = Math.floor(Math.random() * imgs.length);
  this.currentImage = imgs[randomIndex].name;
  this.drawImage();
}


startDrawing(event: MouseEvent) {
  this.isDrawing = true;

  const rect = this.canvasRef.nativeElement.getBoundingClientRect();
  const scaleX = this.canvasRef.nativeElement.width / rect.width;
  const scaleY = this.canvasRef.nativeElement.height / rect.height;

  this.startX = (event.clientX - rect.left) * scaleX;
  this.startY = (event.clientY - rect.top) * scaleY;
}


  drawExistingAnnotations() {
    if (!this.currentImage || !this.annotations[this.currentImage]) return;

    const img = new window.Image();
    img.src = `/image-annotator/assets/object/${this.currentImage}`;
    img.onload = () => {
      this.ctx.clearRect(0, 0, img.width, img.height);
      this.ctx.drawImage(img, 0, 0);

      this.annotations[this.currentImage].forEach((ann) => {
        const scaleX = this.canvasRef.nativeElement.width / this.imageWidth;
        const scaleY = this.canvasRef.nativeElement.height / this.imageHeight;

        this.ctx.strokeStyle = 'blue';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(ann.x / scaleX, ann.y / scaleY, ann.width / scaleX, ann.height / scaleY);

        this.ctx.fillStyle = 'blue';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(ann.title.fr, ann.x / scaleX, ann.y / scaleY - 5);
      });
    };
  }

  saveAnnotations() {
    this.imageService.saveAnnotations(this.annotations).subscribe(() => {
      console.log('Annotations sauvegardées');
    });
  }

markImageComplete(imageName: string) {
  this.images.update((list) => {
    const image = list.find(img => img.name === imageName);
    if (image) image.status = 'terminé';
    return list;
  });
  this.saveToLocalStorage();
}
saveToLocalStorage() {
  const data = {
    images: this.images(),
    annotations: this.annotations,
    date: new Date().toISOString()
  };
  localStorage.setItem('imageData', JSON.stringify(data));
}

loadFromLocalStorage() {
  const dataStr = localStorage.getItem('imageData');
  if (dataStr) {
    try {
      const data = JSON.parse(dataStr);
      if (data.images) this.images.set(data.images);
      if (data.annotations) this.annotations = data.annotations;
      console.log("✅ Données chargées depuis LocalStorage");
    } catch (err) {
      console.error('❌ Erreur lecture localStorage', err);
    }
  }
}


exportData() {
  const exportPayload = {
    date: new Date().toISOString(),
    images: this.images(),          // on appelle le signal pour avoir la vraie valeur
    annotations: this.annotations
  };

  const dataStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `annotations_${new Date().getTime()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

importData(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string);

      if (data.images) this.images.set(data.images);
      if (data.annotations) this.annotations = data.annotations;

      this.saveToLocalStorage(); // on sauvegarde aussi localement
      this.redrawCanvas();       // on redessine le canvas

      console.log('✅ Données importées avec succès !');
    } catch (err) {
      console.error('❌ Erreur import JSON', err);
    }
  };
  reader.readAsText(file);
}


}
