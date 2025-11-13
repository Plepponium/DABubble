import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection, setDoc, deleteDoc, query, orderBy, arrayUnion } from '@angular/fire/firestore';
import { doc, addDoc, docData, updateDoc } from '@angular/fire/firestore';
import { map, Observable, take } from 'rxjs';
import { Channel } from '../models/channel.class';
import { Chat } from '../models/chat.class';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private firestore = inject(Firestore);

  getChannels(): Observable<Channel[]> {
    const channelsCollection = collection(this.firestore, 'channels');
    return collectionData(channelsCollection, { idField: 'id' }) as Observable<Channel[]>;
  }

  addChannel(channel: Partial<Channel>): Promise<any> {
    const channelsCollection = collection(this.firestore, 'channels');
    return addDoc(channelsCollection, channel);
  }

  async deleteChannel(channelId: string): Promise<void> {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    return deleteDoc(channelRef);
  }

  getChannelById(channelId: string): Observable<Channel> {
    const channelDoc = doc(this.firestore, `channels/${channelId}`);
    return docData(channelDoc, { idField: 'id' }) as Observable<Channel>;
  }

  getChatsForChannel(channelId: string): Observable<Chat[]> {
    const chatsCollection = collection(this.firestore, `channels/${channelId}/chats`);
    return collectionData(chatsCollection, { idField: 'id' }) as Observable<any[]>;
  }

  async addAnswerToChat(channelId: string, chatId: string, answer: any): Promise<any> {
    const answersCollection = collection(this.firestore, `channels/${channelId}/chats/${chatId}/answers`);
    return addDoc(answersCollection, answer);
  }

  async setReaction(channelId: string, chatId: string, reactionType: string, userIds: string[]) {
    const chatRef = doc(this.firestore, `channels/${channelId}/chats`, chatId);
    const chatSnapshot = await docData(chatRef, { idField: 'id' }).pipe(take(1)).toPromise();
    const reactions = (chatSnapshot as any)?.reactions || {};

    if (userIds.length === 0) {
      delete reactions[reactionType];
    } else {
      reactions[reactionType] = userIds;
    }

    return updateDoc(chatRef, { reactions });
  }

  async setAnswerReaction(channelId: string, chatId: string, answerId: string, reactionType: string, userIds: string[]) {
    const answerRef = doc(this.firestore, `channels/${channelId}/chats/${chatId}/answers`, answerId);
    const answerSnapshot = await docData(answerRef, { idField: 'id' }).pipe(take(1)).toPromise();
    const reactions = (answerSnapshot as any)?.reactions || {};

    if (userIds.length === 0) {
      delete reactions[reactionType];
    } else {
      reactions[reactionType] = [...userIds];
    }

    return updateDoc(answerRef, { reactions });
  }

  async updateReactionForChat(channelId: string, chatId: string, reactionType: string, userIds: string[]) {
    const reactionDocRef = doc(this.firestore, `channels/${channelId}/chats/${chatId}/reactions`, reactionType);
    return setDoc(reactionDocRef, {
      type: reactionType,
      user: userIds
    });
  }

  async deleteReactionForChat(channelId: string, chatId: string, reactionType: string) {
    const reactionDocRef = doc(this.firestore, `channels/${channelId}/chats/${chatId}/reactions`, reactionType);
    return deleteDoc(reactionDocRef);
  }

  getAnswersForChat(channelId: string, chatId: string): Observable<any[]> {
    const answersCollection = collection(this.firestore, `channels/${channelId}/chats/${chatId}/answers`);
    const answersQuery = query(answersCollection, orderBy('time', 'asc'));
    return collectionData(answersQuery, { idField: 'id' }) as Observable<any[]>;
  }

  getReactionsForAnswer(channelId: string, chatId: string, answerId: string): Observable<any> {
    const collectionRef = collection(this.firestore, `channels/${channelId}/chats/${chatId}/answers/${answerId}/reactions`);
    return collectionData(collectionRef, { idField: 'reactionId' }); // Structure analog zu Chat-Reactions
  }

  addChatToChannel(channelId: string, chat: any): Promise<any> {
    const chatsCollection = collection(this.firestore, `channels/${channelId}/chats`);
    return addDoc(chatsCollection, chat);
  }

  updateChannel(id: string, data: Partial<Channel>) {
    const ref = doc(this.firestore, 'channels', id);
    return updateDoc(ref, data);
  }

  async updateChatMessage(channelId: string, chatId: string, newText: string) {
    try {
      const chatRef = doc(this.firestore, `channels/${channelId}/chats/${chatId}`);
      await updateDoc(chatRef, { message: newText });
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Chatnachricht:', err);
      throw err;
    }
  }

  async updateAnswerMessage(channelId: string, chatId: string, answerId: string, newText: string) {
    try {
      const answerRef = doc(this.firestore, `channels/${channelId}/chats/${chatId}/answers/${answerId}`);
      await updateDoc(answerRef, { message: newText });
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Antwort:', err);
      throw err;
    }
  }

  async addParticipants(channelId: string, userIds: string[]) {
    const ref = doc(this.firestore, 'channels', channelId);

    return updateDoc(ref, {
      participants: arrayUnion(...userIds)
    });
  }
}