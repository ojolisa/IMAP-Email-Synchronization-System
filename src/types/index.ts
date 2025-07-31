export interface IMAPConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    tls: boolean;
    tlsOptions?: any;
    accountName: string;
}

export interface EmailMessage {
    uid: number;
    messageId: string;
    subject: string;
    from: string;
    to: string;
    date: Date;
    body: string;
    folder: string;
    accountName: string;
    flags: string[];
}

export interface IMAPAccount {
    config: IMAPConfig;
    connection: any;
    isConnected: boolean;
}
