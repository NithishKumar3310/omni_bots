
import { User, AuthSession, UserRole } from '../types';

const USER_DB_KEY = 's2_legal_vault_users';
const SESSION_KEY = 's2_legal_active_session';

export class AuthService {
  static getUsers(): User[] {
    const data = localStorage.getItem(USER_DB_KEY);
    return data ? JSON.parse(data) : [];
  }

  static register(email: string, password: string, fullName: string, role: UserRole): AuthSession {
    const users = this.getUsers();
    
    if (users.find(u => u.email === email)) {
      throw new Error("e-mail address already registered in the legal vault.");
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      password, // Simulated
      fullName,
      role,
      createdAt: new Date()
    };

    users.push(newUser);
    localStorage.setItem(USER_DB_KEY, JSON.stringify(users));

    return this.login(email, password);
  }

  static login(email: string, password: string): AuthSession {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      throw new Error("Invalid credentials. Access denied by S2 Security.");
    }

    const session: AuthSession = {
      user: { ...user, password: undefined },
      token: `jwt_${Math.random().toString(36).substr(2)}`,
      loginTime: new Date()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  static getSession(): AuthSession | null {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  static logout() {
    localStorage.removeItem(SESSION_KEY);
  }
}
