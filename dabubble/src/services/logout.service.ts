import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LogoutService {
    private _logout$ = new Subject<void>();
    readonly logout$ = this._logout$.asObservable();

    triggerLogout(): void {
        this._logout$.next();
    }

    complete(): void {
        this._logout$.complete();
    }
}