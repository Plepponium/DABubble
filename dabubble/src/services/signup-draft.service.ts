import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user.class';

@Injectable({ providedIn: 'root' })
export class SignupDraftService {
    private readonly key = 'dabubble_signup_draft_v1';
    private subject = new BehaviorSubject<User | null>(null);

    /** Sets user draft in memory and sessionStorage. */
    setDraft(user: User): void {
        this.updateSubject(user);
        this.saveToSessionStorage(user);
    }

    /** Updates BehaviorSubject with new draft value. */
    private updateSubject(user: User | null): void {
        this.subject.next(user);
    }

    /** Persists user draft to sessionStorage safely. */
    private saveToSessionStorage(user: User): void {
        try {
            sessionStorage.setItem(this.key, JSON.stringify(user));
        } catch (e) {
            console.warn('Could not write signup draft to sessionStorage', e);
        }
    }

    /** Retrieves draft from memory or sessionStorage. */
    getDraft(): User | null {
        const cached = this.subject.value;
        if (cached) return cached;
        return this.loadFromSessionStorage();
    }

    /** Loads and parses draft from sessionStorage. */
    private loadFromSessionStorage(): User | null {
        try {
            const raw = sessionStorage.getItem(this.key);
            if (!raw) return null;
            return this.parseUserFromStorage(raw);
        } catch (e) {
            console.warn('Could not read signup draft from sessionStorage', e);
            return null;
        }
    }

    /** Parses JSON to User instance and caches it. */
    private parseUserFromStorage(raw: string): User {
        const parsed = JSON.parse(raw);
        const user = new User(parsed);
        this.updateSubject(user);
        return user;
    }

    /** Clears draft from memory and sessionStorage. */
    clear() {
        this.updateSubject(null);
        this.removeFromSessionStorage();
    }

    /** Removes draft key from sessionStorage safely. */
    private removeFromSessionStorage(): void {
        try {
            sessionStorage.removeItem(this.key);
        } catch {
            // Ignore sessionStorage removal errors
        }
    }

    /** Returns observable of draft state changes. */
    draft$() {
        return this.subject.asObservable();
    }
}
