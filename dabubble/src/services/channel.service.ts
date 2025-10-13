import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection, setDoc, deleteDoc } from '@angular/fire/firestore';
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

  getChannelById(channelId: string): Observable<Channel> {
    const channelDoc = doc(this.firestore, `channels/${channelId}`);
    return docData(channelDoc, { idField: 'id' }) as Observable<Channel>;
  }

  getChatsForChannel(channelId: string): Observable<Chat[]> {
    const chatsCollection = collection(this.firestore, `channels/${channelId}/chats`);
    return collectionData(chatsCollection, { idField: 'id' }) as Observable<any[]>;
  }

  // getReactionsForChat(channelId: string, chatId: string): Observable<Record<string, string[]>> {
  //   const reactionsCollection = collection(this.firestore, `channels/${channelId}/chats/${chatId}/reactions`);
  //   return collectionData(reactionsCollection, { idField: 'reactionId' }).pipe(
  //     take(1),
  //     map(docs => {
  //       const reactionsMap: Record<string, string[]> = {};
  //       docs.forEach(doc => {
  //         const type = doc['type'];
  //         const users = Array.isArray(doc['user']) ? doc['user'] : [doc['user']];
  //         if (type) {
  //           if (!reactionsMap[type]) {
  //             reactionsMap[type] = [];
  //           }
  //           // type: reactionsMap[type];
  //           // userId: reactionsMap[type].concat(users);
  //           reactionsMap[type] = reactionsMap[type].concat(users);
  //         }
  //       });
  //       return reactionsMap;
  //     })
  //   );
  // }
  getReactionsMapForChat(channelId: string, chatId: string): Observable<Record<string, string[]>> {
    const chatDoc = doc(this.firestore, `channels/${channelId}/chats/${chatId}`);
    return docData(chatDoc).pipe(
      take(1),
      map((data: any) => data?.reactions || {})
    );
  }

  // async updateReactionsMapForChat(channelId: string, chatId: string, reactionsMap: Record<string, string[]>) {
  //   const chatRef = doc(this.firestore, `channels/${channelId}/chats`, chatId);
  //   return updateDoc(chatRef, {
  //     reactions: reactionsMap
  //   });
  // }
  
  // async setReaction(channelId: string, chatId: string, reactionType: string, userIds: string[]) {
  //   const chatRef = doc(this.firestore, `channels/${channelId}/chats`, chatId);
  //   // Hole die aktuelle Map
  //   const chatData = await docData(chatRef, { idField: 'id' }) as any;
  //   const reactions = chatData.reactions || {};

  //   if (userIds.length === 0) {
  //     // Reaktion entfernen
  //     delete reactions[reactionType];
  //   } else {
  //     // Reaktion setzen
  //     reactions[reactionType] = userIds;
  //   }

  //   return updateDoc(chatRef, { reactions });
  // } 
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
    console.log('chatId', chatId, 'answerId:', answerId);
    console.log('Firestore-Pfad:', `channels/${channelId}/chats/${chatId}/answers/${answerId}`);
    const answerRef = doc(this.firestore, `channels/${channelId}/chats/${chatId}/answers`, answerId);
    const answerSnapshot = await docData(answerRef, { idField: 'id' }).pipe(take(1)).toPromise();
    const reactions = (answerSnapshot as any)?.reactions || {};

    if (userIds.length === 0) {
      delete reactions[reactionType];
    } else {
      reactions[reactionType] = userIds;
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
    return collectionData(answersCollection, { idField: 'id' }) as Observable<any[]>;
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
}