# Next Steps - Priority Action Items

## 🔥 IMMEDIATE ACTIONS (This Week)

### 1. Get API Keys & Test the Pipeline (30 minutes)

**You need these API keys to test the AI pipeline:**

1. **Anthropic API Key** (Claude)
   - Go to: https://console.anthropic.com/
   - Sign up or log in
   - Create an API key
   - Copy to `api/.env` → `ANTHROPIC_API_KEY`

2. **AWS Credentials** (for S3 + Textract)
   - Go to AWS Console → IAM
   - Create a new user with programmatic access
   - Attach policies: `AmazonS3FullAccess`, `AmazonTextractFullAccess`
   - Copy Access Key ID and Secret Access Key
   - Update `api/.env`:
     ```
     AWS_ACCESS_KEY_ID="your-key-here"
     AWS_SECRET_ACCESS_KEY="your-secret-here"
     ```

3. **Create S3 Bucket**
   - Go to AWS Console → S3
   - Create bucket named: `referralflow-documents`
   - Region: `us-east-1` (or update `AWS_REGION` in .env)
   - Keep default settings (private bucket)

4. **Test the Pipeline**
   ```bash
   # Terminal 1: Start Docker
   docker-compose up -d
   
   # Terminal 2: Start API
   cd api
   npm run db:push
   npm run dev
   
   # Terminal 3: Start Workers
   cd api
   npm run workers:dev
   
   # Terminal 4: Start Frontend
   npm run dev
   ```

5. **Upload a test document:**
   - Open http://localhost:3000
   - Create a referral
   - Upload a PDF (any medical document or even a test PDF)
   - Watch the console logs in Terminal 3 to see processing

---

### 2. Add Authentication (2-3 days)

**Why:** Currently all endpoints are public. Anyone can access patient data.

**Implementation Plan:**

#### Step 1: Install dependencies
```bash
cd api
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

#### Step 2: Create auth files

**File: `api/src/lib/jwt.ts`**
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export function generateToken(userId: string, email: string, role: string) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}
```

**File: `api/src/middleware/auth.ts`**
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../lib/jwt.js';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
  
  // Attach user to request
  (request as any).user = decoded;
}
```

**File: `api/src/routes/auth.ts`**
```typescript
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../lib/jwt.js';

export async function authRoutes(fastify: FastifyInstance) {
  
  // Register
  fastify.post('/register', async (request, reply) => {
    const { email, password, firstName, lastName, organizationId } = request.body as any;
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(400).send({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        organizationId,
        role: 'viewer'
      }
    });
    
    const token = generateToken(user.id, user.email, user.role);
    
    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });
  
  // Login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id, user.email, user.role);
    
    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });
  
  // Get current user
  fastify.get('/me', { preHandler: authMiddleware }, async (request) => {
    const { userId } = (request as any).user;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });
    
    return { user };
  });
}
```

#### Step 3: Register auth routes
Update `api/src/index.ts`:
```typescript
import { authRoutes } from './routes/auth.js';

// Add this line with other route registrations:
await fastify.register(authRoutes, { prefix: '/api/auth' });
```

#### Step 4: Protect routes
Add to routes that need protection:
```typescript
fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
  // Your route handler
});
```

---

### 3. Enhance Decision Panel UI (1-2 days)

**Current State:** ReferralDetail shows AI recommendation but no decision buttons

**What to Add:**

1. Decision buttons (Accept, Decline, Request More Info)
2. Decline reason dropdown
3. Notes textarea
4. Confirmation modal
5. Show if following/overriding AI

**File to Edit:** `components/ReferralDetail.tsx`

Add this section after the AI recommendation display:

```typescript
const [showDecisionModal, setShowDecisionModal] = useState(false);
const [decision, setDecision] = useState<'accept' | 'decline' | 'request_info' | null>(null);
const [declineReason, setDeclineReason] = useState('');
const [notes, setNotes] = useState('');

const handleDecision = async () => {
  const response = await fetch(`http://localhost:4000/api/referrals/${referralId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision,
      declineReason: decision === 'decline' ? declineReason : null,
      notes
    })
  });
  
  if (response.ok) {
    // Refresh referral data
    // Show success message
  }
};

// Add this UI component:
<div className="bg-white rounded-lg shadow p-6 mt-6">
  <h3 className="text-lg font-semibold mb-4">Make Decision</h3>
  
  <div className="flex gap-3 mb-4">
    <button 
      onClick={() => { setDecision('accept'); setShowDecisionModal(true); }}
      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
    >
      Accept
    </button>
    <button 
      onClick={() => { setDecision('decline'); setShowDecisionModal(true); }}
      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      Decline
    </button>
    <button 
      onClick={() => { setDecision('request_info'); setShowDecisionModal(true); }}
      className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
    >
      Request More Info
    </button>
  </div>
  
  {/* Add modal for confirmation */}
</div>
```

---

## 📋 CHECKLIST FOR PRODUCTION

- [ ] Add authentication
- [ ] Test full AI pipeline with real medical documents
- [ ] Add decision panel UI
- [ ] Create seed data with sample criteria
- [ ] Add error handling and validation
- [ ] Write tests for critical paths
- [ ] HIPAA compliance review
- [ ] Add monitoring and logging
- [ ] Deploy to production environment
- [ ] Set up CI/CD pipeline

---

## 🎯 SUCCESS METRICS

After completing the above, you should be able to:

1. ✅ Upload a PDF medical document
2. ✅ See OCR extract text automatically
3. ✅ See AI classify the document type
4. ✅ See AI extract structured patient data
5. ✅ See AI generate accept/decline recommendation with rationale
6. ✅ See risk flags with severity levels
7. ✅ Make a decision (accept/decline) with notes
8. ✅ View complete audit trail
9. ✅ See analytics dashboard update
10. ✅ Manage bed capacity

---

## 💡 TIPS

- Start with authentication - it's critical for security
- Test with real medical documents (redacted for privacy)
- Monitor AWS costs (Textract charges per page)
- Use the seed script to create test data
- Check worker logs to debug AI processing issues
- Redis must be running for workers to function

