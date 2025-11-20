import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddChannelMembersOverlayComponent } from './add-channel-members-overlay.component';

describe('AddChannelMembersOverlayComponent', () => {
  let component: AddChannelMembersOverlayComponent;
  let fixture: ComponentFixture<AddChannelMembersOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddChannelMembersOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddChannelMembersOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
