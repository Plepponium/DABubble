import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoutOverlayComponent } from './logout-overlay.component';

describe('LogoutOverlayComponent', () => {
  let component: LogoutOverlayComponent;
  let fixture: ComponentFixture<LogoutOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoutOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogoutOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
