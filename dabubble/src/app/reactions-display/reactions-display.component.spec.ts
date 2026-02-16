import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionsDisplayComponent } from './reactions-display.component';

describe('ReactionsDisplayComponent', () => {
  let component: ReactionsDisplayComponent;
  let fixture: ComponentFixture<ReactionsDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionsDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactionsDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
