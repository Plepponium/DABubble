import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionIconsDialogComponent } from './reaction-icons-dialog.component';

describe('ReactionIconsDialogComponent', () => {
  let component: ReactionIconsDialogComponent;
  let fixture: ComponentFixture<ReactionIconsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionIconsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactionIconsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
