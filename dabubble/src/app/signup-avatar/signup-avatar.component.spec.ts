import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupAvatarComponent } from './signup-avatar.component';

describe('SignupAvatarComponent', () => {
  let component: SignupAvatarComponent;
  let fixture: ComponentFixture<SignupAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupAvatarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignupAvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
