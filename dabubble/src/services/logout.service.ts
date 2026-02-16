import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LogoutService {
    private _logout$ = new Subject<void>();
    readonly logout$ = this._logout$.asObservable();

    /**
    * Triggers the logout process by emitting a value on the logout$ observable.
    */
    triggerLogout(): void {
        this._logout$.next();
    }

    /**
    * Completes the logout$ observable, indicating that no more logout events will be emitted.
    */
    complete(): void {
        this._logout$.complete();
    }
}