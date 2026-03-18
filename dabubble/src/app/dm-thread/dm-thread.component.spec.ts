import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DmThreadComponent } from './dm-thread.component';

describe('DmThreadComponent', () => {
  let component: DmThreadComponent;
  let fixture: ComponentFixture<DmThreadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DmThreadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DmThreadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
