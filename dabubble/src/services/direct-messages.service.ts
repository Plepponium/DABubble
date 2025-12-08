import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection, doc, docData } from '@angular/fire/firestore';
import { query, where, getDocs, addDoc, serverTimestamp, orderBy, arrayUnion, updateDoc, arrayRemove, getDoc, deleteField } from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DirectMessageService {
    private firestore = inject(Firestore);

    private participantsKeyFor(a: string, b: string) {
        const [x, y] = [a, b].sort();
        return `${x}_${y}`;
    }

    async getOrCreateDmId(uidA: string, uidB: string): Promise<string> {
        const key = this.participantsKeyFor(uidA, uidB);
        const dmColRef = collection(this.firestore, 'dmChats');
        const q = query(dmColRef as any, where('participantsKey', '==', key));
        const snap = await getDocs(q);
        if (!snap.empty) {
            return snap.docs[0].id;
        }
        const newDocRef = await addDoc(dmColRef as any, {
            participants: [uidA, uidB].sort(),
            participantsKey: key,
            createdBy: uidA,
            createdAt: serverTimestamp()
        });
        return newDocRef.id;
    }

    getMessages(dmId: string): Observable<any[]> {
        const messagesCol = collection(this.firestore, `dmChats/${dmId}/messages`);
        const q = query(messagesCol as any, orderBy('sentAt', 'asc'));
        return collectionData(q as any, { idField: 'id' }) as Observable<any[]>;
    }

    async sendMessage(dmId: string, payload: { senderId: string; text: string; }) {
        const messagesCol = collection(this.firestore, `dmChats/${dmId}/messages`);
        return addDoc(messagesCol as any, {
            ...payload,
            sentAt: serverTimestamp()
        });
    }

    getDmDoc(dmId: string): Observable<any> {
        const docRef = doc(this.firestore, `dmChats/${dmId}`);
        return docData(docRef as any, { idField: 'id' }) as Observable<any>;
    }

    async updateMessageText(dmId: string, messageId: string, newText: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        return updateDoc(msgRef as any, {
            text: newText,
            // editedAt: serverTimestamp()
        });
    }

    async addReactionToMessage(dmId: string, messageId: string, type: string, userId: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        return updateDoc(msgRef as any, { [`reactions.${type}`]: arrayUnion(userId) });
    }

    async removeReactionFromMessage(dmId: string, messageId: string, type: string, userId: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        return updateDoc(msgRef as any, { [`reactions.${type}`]: arrayRemove(userId) });
    }

    async reactToMessageToggle(dmId: string, messageId: string, type: string, userId: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        const snap = await getDoc(msgRef as any);
        if (!snap.exists()) return;
        const data: any = snap.data() || {};
        const reactions = data.reactions || {};
        const current: string[] = reactions[type] || [];
        const has = current.includes(userId);
        if (has) {
            const updated = current.filter(u => u !== userId);
            if (updated.length === 0) {
                return updateDoc(msgRef, {
                    [`reactions.${type}`]: deleteField()
                });
            }
            return updateDoc(msgRef, {
                [`reactions.${type}`]: updated
            });
        }
        return updateDoc(msgRef, {
            [`reactions.${type}`]: [...current, userId]
        });
    }

    async getDmIdsForUser(uid: string): Promise<string[]> {
        const dmCol = collection(this.firestore, 'dmChats');
        const q = query(dmCol as any, where('participants', 'array-contains', uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.id);
    }

}
