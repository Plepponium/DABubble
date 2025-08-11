import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwChangeComponent } from './pw-change.component';

describe('PwChangeComponent', () => {
  let component: PwChangeComponent;
  let fixture: ComponentFixture<PwChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwChangeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PwChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
