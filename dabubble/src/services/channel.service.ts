import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection, doc, addDoc, docData, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../models/channel.class';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private firestore = inject(Firestore);

  constructor() { }

  getChannels(): Observable<Channel[]> {
    const channelsCollection = collection(this.firestore, 'channels');
    return collectionData(channelsCollection, { idField: 'id' }) as Observable<Channel[]>;
  }

  addChannel(channel: Partial<Channel>): Promise<any> {
    const channelsCollection = collection(this.firestore, 'channels');
    return addDoc(channelsCollection, channel);
  }

  getChannelById(channelId: string): Observable<Channel> {
    const channelDoc = doc(this.firestore, `channels/${channelId}`);
    return docData(channelDoc, { idField: 'id' }) as Observable<Channel>;
  }

  getChatsForChannel(channelId: string): Observable<any[]> {
    const chatsCollection = collection(this.firestore, `channels/${channelId}/chats`);
    return collectionData(chatsCollection, { idField: 'id' }) as Observable<any[]>;
  }

  getAnswersForChat(channelId: string, chatId: string): Observable<any[]> {
    const answersCollection = collection(this.firestore, `channels/${channelId}/chats/${chatId}/answers`);
    return collectionData(answersCollection, { idField: 'id' }) as Observable<any[]>;
  }

  addChatToChannel(channelId: string, chat: any): Promise<any> {
    const chatsCollection = collection(this.firestore, `channels/${channelId}/chats`);
    return addDoc(chatsCollection, chat);
  }

  updateChannel(id: string, data: Partial<Channel>) {
    const ref = doc(this.firestore, 'channels', id);
    return updateDoc(ref, data);
  }
}