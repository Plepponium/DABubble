import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user.class';

@Injectable({ providedIn: 'root' })
export class SignupDraftService {
    private readonly key = 'dabubble_signup_draft_v1';
    private subject = new BehaviorSubject<User | null>(null);

    setDraft(user: User) {
        this.subject.next(user);
        try {
            sessionStorage.setItem(this.key, JSON.stringify(user));
        } catch (e) {
            console.warn('Could not write signup draft to sessionStorage', e);
        }
    }

    getDraft(): User | null {
        const cur = this.subject.value;
        if (cur) return cur;

        try {
            const raw = sessionStorage.getItem(this.key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const user = new User(parsed);
            this.subject.next(user);
            return user;
        } catch (e) {
            console.warn('Could not read signup draft from sessionStorage', e);
            return null;
        }
    }

    clear() {
        this.subject.next(null);
        try { sessionStorage.removeItem(this.key); } catch { }
    }

    // optional observable
    draft$() {
        return this.subject.asObservable();
    }
}
