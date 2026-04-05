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
}