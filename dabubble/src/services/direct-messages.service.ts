import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection, doc, docData } from '@angular/fire/firestore';
import { query, where, getDocs, addDoc, serverTimestamp, orderBy, arrayUnion, updateDoc, arrayRemove, getDoc, deleteField } from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DirectMessageService {
    private firestore = inject(Firestore);

    /** Creates sorted participants key for DM identification. */
    private participantsKeyFor(a: string, b: string) {
        const [x, y] = [a, b].sort();
        return `${x}_${y}`;
    }

    /** Retrieves or creates DM chat ID for two users. */
    async getOrCreateDmId(uidA: string, uidB: string): Promise<string> {
        const key = this.participantsKeyFor(uidA, uidB);
        const existingId = await this.findExistingDmId(key);
        return existingId ?? await this.createNewDm(key, uidA, uidB);
    }

    /** Finds existing DM ID by participants key. */
    private async findExistingDmId(key: string): Promise<string | null> {
        const dmColRef = collection(this.firestore, 'dmChats');
        const q = query(dmColRef as any, where('participantsKey', '==', key));
        const snap = await getDocs(q);
        return snap.empty ? null : snap.docs[0].id;
    }

    /** Creates new DM chat document. */
    private async createNewDm(key: string, uidA: string, uidB: string): Promise<string> {
        const dmColRef = collection(this.firestore, 'dmChats');
        const newDocRef = await addDoc(dmColRef as any, {
            participants: [uidA, uidB].sort(),
            participantsKey: key,
            createdBy: uidA,
            createdAt: serverTimestamp()
        });
        return newDocRef.id;
    }

    /** Streams messages for DM chat ordered by sent time. */
    getMessages(dmId: string): Observable<any[]> {
        const messagesCol = collection(this.firestore, `dmChats/${dmId}/messages`);
        const q = query(messagesCol as any, orderBy('sentAt', 'asc'));
        return collectionData(q as any, { idField: 'id' }) as Observable<any[]>;
    }

    /** Sends new message to DM chat. */
    async sendMessage(dmId: string, payload: { senderId: string; text: string; }) {
        const messagesCol = collection(this.firestore, `dmChats/${dmId}/messages`);
        return addDoc(messagesCol as any, {
            ...payload, sentAt: serverTimestamp()
        });
    }

    /** Streams DM chat document data. */
    getDmDoc(dmId: string): Observable<any> {
        const docRef = doc(this.firestore, `dmChats/${dmId}`);
        return docData(docRef as any, { idField: 'id' }) as Observable<any>;
    }

    /** Updates message text in DM chat. */
    async updateMessageText(dmId: string, messageId: string, newText: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        return updateDoc(msgRef as any, { text: newText });
    }

    /** Adds user reaction to message. */
    async addReactionToMessage(dmId: string, messageId: string, type: string, userId: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        return updateDoc(msgRef as any, { [`reactions.${type}`]: arrayUnion(userId) });
    }

    /** Removes user reaction from message. */
    async removeReactionFromMessage(dmId: string, messageId: string, type: string, userId: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        return updateDoc(msgRef as any, { [`reactions.${type}`]: arrayRemove(userId) });
    }

    /** Toggles user reaction on message. */
    async reactToMessageToggle(dmId: string, messageId: string, type: string, userId: string) {
        const msgRef = doc(this.firestore, `dmChats/${dmId}/messages/${messageId}`);
        const snap = await getDoc(msgRef as any);
        if (!snap.exists()) return;
        const currentUsers = this.getCurrentReactionUsers(snap.data(), type);
        const hasReaction = currentUsers.includes(userId);
        hasReaction ? this.removeReaction(msgRef, type, userId, currentUsers) : this.addReaction(msgRef, type, userId, currentUsers);
    }

    /** Extracts current reaction users from message data. */
    private getCurrentReactionUsers(data: any, type: string): string[] {
        const reactions = data?.reactions || {};
        return reactions[type] || [];
    }

    /** Adds new reaction to message. */
    private async addReaction(msgRef: any, type: string, userId: string, currentUsers: string[]): Promise<void> {
        await updateDoc(msgRef, { [`reactions.${type}`]: [...currentUsers, userId] });
    }

    /** Removes reaction from message handling empty arrays. */
    private async removeReaction(msgRef: any, type: string, userId: string, currentUsers: string[]): Promise<void> {
        const updated = currentUsers.filter(u => u !== userId);
        const updateData = updated.length === 0 ? { [`reactions.${type}`]: deleteField() } : { [`reactions.${type}`]: updated };
        await updateDoc(msgRef, updateData);
    }

    /** Gets all DM chat IDs for specific user. */
    async getDmIdsForUser(uid: string): Promise<string[]> {
        const dmCol = collection(this.firestore, 'dmChats');
        const q = query(dmCol as any, where('participants', 'array-contains', uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.id);
    }
}
