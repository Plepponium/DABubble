import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelDescriptionOverlayComponent } from './channel-description-overlay.component';

describe('ChannelDescriptionOverlayComponent', () => {
  let component: ChannelDescriptionOverlayComponent;
  let fixture: ComponentFixture<ChannelDescriptionOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelDescriptionOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelDescriptionOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
