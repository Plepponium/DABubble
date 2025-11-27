import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputMissingOverlayComponent } from './input-missing-overlay.component';

describe('InputMissingOverlayComponent', () => {
  let component: InputMissingOverlayComponent;
  let fixture: ComponentFixture<InputMissingOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputMissingOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputMissingOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
