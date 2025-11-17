import { Component, ElementRef, EventEmitter, HostListener, Input, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-smiley-overlay',
  imports: [CommonModule],
  templateUrl: './smiley-overlay.component.html',
  styleUrl: './smiley-overlay.component.scss'
})
export class SmileyOverlayComponent {
  @Input() emojis: string[] = [];   
  @Input() active = false;              // Wird vom Parent gesteuert
  @Output() selected = new EventEmitter<string>();
  @Output() activeChange = new EventEmitter<boolean>();

  filteredItems: string[] = [];
  activeIndex = 0;

  ngOnChanges() {
    if (this.active) {
      this.filteredItems = [...this.emojis];
      this.activeIndex = 0;
    }
  }

  select(smiley: string) {
    this.selected.emit(smiley);
    this.close();
  }

  close() {
    this.active = false;
    this.activeChange.emit(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event) {
    if (!this.active) return;

    const inside = (event.target as HTMLElement).closest('.smiley-overlay');
    if (!inside) {
      this.close();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.active) return;

    if (e.key === 'Escape') {
      this.close();
      e.preventDefault();
    }
    if (e.key === 'Enter') {
      this.select(this.filteredItems[this.activeIndex]);
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') {
      this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
      e.preventDefault();
    }
    if (e.key === 'ArrowUp') {
      this.activeIndex = (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
      e.preventDefault();
    }
  }
}