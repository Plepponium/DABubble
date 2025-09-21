// src/app/services/direct-message.service.ts
import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection, doc, docData } from '@angular/fire/firestore';
import { query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DirectMessageService {
    private firestore = inject(Firestore);

    /** Build deterministic key for two UIDs (sorted) */
    private participantsKeyFor(a: string, b: string) {
        const [x, y] = [a, b].sort();
        return `${x}_${y}`;
    }

    /** Find existing DM id for pair or create a new DM and return its id */
    async getOrCreateDmId(uidA: string, uidB: string): Promise<string> {
        const key = this.participantsKeyFor(uidA, uidB);
        const dmColRef = collection(this.firestore, 'dmChats');
        const q = query(dmColRef as any, where('participantsKey', '==', key));
        const snap = await getDocs(q);
        if (!snap.empty) {
            return snap.docs[0].id;
        }
        // create new DM
        const newDocRef = await addDoc(dmColRef as any, {
            participants: [uidA, uidB].sort(),
            participantsKey: key,
            createdBy: uidA,
            createdAt: serverTimestamp()
        });
        return newDocRef.id;
    }

    /** Observe messages in a DM, ordered by sentAt */
    getMessages(dmId: string): Observable<any[]> {
        const messagesCol = collection(this.firestore, `dmChats/${dmId}/messages`);
        const q = query(messagesCol as any, orderBy('sentAt', 'asc'));
        return collectionData(q as any, { idField: 'id' }) as Observable<any[]>;
    }

    /** Add a message to messages subcollection */
    async sendMessage(dmId: string, payload: { senderId: string; senderName: string; senderImg?: string; text: string; }) {
        const messagesCol = collection(this.firestore, `dmChats/${dmId}/messages`);
        return addDoc(messagesCol as any, {
            ...payload,
            sentAt: serverTimestamp()
        });
    }

    /** optionally: get DM meta document observable */
    getDmDoc(dmId: string): Observable<any> {
        const docRef = doc(this.firestore, `dmChats/${dmId}`);
        return docData(docRef as any, { idField: 'id' }) as Observable<any>;
    }
}
