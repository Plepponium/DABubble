import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DmReactionsDialogComponent } from './dm-reactions-dialog.component';

describe('DmReactionsDialogComponent', () => {
  let component: DmReactionsDialogComponent;
  let fixture: ComponentFixture<DmReactionsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DmReactionsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DmReactionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
