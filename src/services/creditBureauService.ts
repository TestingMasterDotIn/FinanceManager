// Credit Bureau API Integration Service
// Note: This is a mock implementation. In production, you would integrate with actual APIs like:
// - CIBIL TransUnion API
// - Experian API  
// - Equifax API
// - CRIF High Mark API

export interface PanCardDetails {
  panNumber: string;
  fullName: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
}

export interface CreditScoreResponse {
  success: boolean;
  data?: {
    score: number;
    provider: 'CIBIL' | 'Experian' | 'Equifax' | 'CRIF';
    reportDate: string;
    factors: {
      payment_history: number;
      credit_utilization: number;
      credit_length: number;
      credit_mix: number;
      new_inquiries: number;
    };
    accounts: Array<{
      accountType: string;
      bank: string;
      currentBalance: number;
      status: string;
    }>;
    inquiries: Array<{
      bank: string;
      date: string;
      type: string;
    }>;
  };
  error?: string;
  message?: string;
}

class CreditBureauService {
  private baseUrl = import.meta.env.VITE_CREDIT_API_URL || 'https://api.creditbureau.com';
  private apiKey = import.meta.env.VITE_CREDIT_API_KEY || 'demo-key';
  private useSandbox = import.meta.env.VITE_USE_SANDBOX_APIS === 'true';
  private mockDelay = parseInt(import.meta.env.VITE_MOCK_API_DELAY || '2000');

  // Validate PAN card format
  validatePan(panNumber: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(panNumber.toUpperCase());
  }

  // Mock API call to CIBIL TransUnion
  async fetchCibilScore(panDetails: PanCardDetails): Promise<CreditScoreResponse> {
    try {
      // In production, this would be:
      // const response = await fetch(`${this.baseUrl}/cibil/score`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(panDetails)
      // });

      // Mock implementation with realistic data
      await this.delay(this.mockDelay); // Simulate API call delay

      if (!this.validatePan(panDetails.panNumber)) {
        return {
          success: false,
          error: 'Invalid PAN format',
          message: 'Please provide a valid 10-character PAN number'
        };
      }

      // Mock successful response
      const mockScore = this.generateMockScore(panDetails.panNumber);
      
      return {
        success: true,
        data: {
          score: mockScore.score,
          provider: 'CIBIL',
          reportDate: new Date().toISOString(),
          factors: mockScore.factors,
          accounts: mockScore.accounts,
          inquiries: mockScore.inquiries
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'API_ERROR',
        message: 'Failed to fetch credit score. Please try again later.'
      };
    }
  }

  // Mock API call to Experian
  async fetchExperianScore(panDetails: PanCardDetails): Promise<CreditScoreResponse> {
    try {
      await this.delay(this.mockDelay + 500);
      
      if (!this.validatePan(panDetails.panNumber)) {
        return {
          success: false,
          error: 'Invalid PAN format'
        };
      }

      const mockScore = this.generateMockScore(panDetails.panNumber, 'Experian');
      
      return {
        success: true,
        data: {
          score: mockScore.score,
          provider: 'Experian',
          reportDate: new Date().toISOString(),
          factors: mockScore.factors,
          accounts: mockScore.accounts,
          inquiries: mockScore.inquiries
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'API_ERROR',
        message: 'Failed to fetch Experian credit score.'
      };
    }
  }

  // Mock API call to Equifax
  async fetchEquifaxScore(panDetails: PanCardDetails): Promise<CreditScoreResponse> {
    try {
      await this.delay(this.mockDelay + 1000);
      
      const mockScore = this.generateMockScore(panDetails.panNumber, 'Equifax');
      
      return {
        success: true,
        data: {
          score: mockScore.score,
          provider: 'Equifax',
          reportDate: new Date().toISOString(),
          factors: mockScore.factors,
          accounts: mockScore.accounts,
          inquiries: mockScore.inquiries
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'API_ERROR'
      };
    }
  }

  // Fetch from all bureaus
  async fetchAllScores(panDetails: PanCardDetails): Promise<{
    cibil: CreditScoreResponse;
    experian: CreditScoreResponse;
    equifax: CreditScoreResponse;
  }> {
    const [cibil, experian, equifax] = await Promise.allSettled([
      this.fetchCibilScore(panDetails),
      this.fetchExperianScore(panDetails),
      this.fetchEquifaxScore(panDetails)
    ]);

    return {
      cibil: cibil.status === 'fulfilled' ? cibil.value : { success: false, error: 'FETCH_FAILED' },
      experian: experian.status === 'fulfilled' ? experian.value : { success: false, error: 'FETCH_FAILED' },
      equifax: equifax.status === 'fulfilled' ? equifax.value : { success: false, error: 'FETCH_FAILED' }
    };
  }

  // Helper methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateMockScore(panNumber: string, provider: 'CIBIL' | 'Experian' | 'Equifax' = 'CIBIL') {
    // Generate consistent mock data based on PAN
    const hash = this.simpleHash(panNumber);
    const baseScore = 650 + (hash % 200); // Score between 650-850
    
    // Adjust score slightly based on provider
    const providerAdjustment = {
      'CIBIL': 0,
      'Experian': -10,
      'Equifax': 5
    };
    
    const finalScore = Math.min(850, Math.max(300, baseScore + providerAdjustment[provider]));
    
    return {
      score: finalScore,
      factors: {
        payment_history: 80 + (hash % 20),
        credit_utilization: 30 + (hash % 40),
        credit_length: 60 + (hash % 30),
        credit_mix: 70 + (hash % 25),
        new_inquiries: 5 + (hash % 15)
      },
      accounts: [
        {
          accountType: 'Credit Card',
          bank: 'HDFC Bank',
          currentBalance: 25000 + (hash % 50000),
          status: 'Active'
        },
        {
          accountType: 'Personal Loan',
          bank: 'ICICI Bank',
          currentBalance: 150000 + (hash % 200000),
          status: 'Active'
        },
        {
          accountType: 'Home Loan',
          bank: 'SBI',
          currentBalance: 2500000 + (hash % 1000000),
          status: 'Active'
        }
      ],
      inquiries: [
        {
          bank: 'Axis Bank',
          date: '2025-06-15',
          type: 'Credit Card'
        },
        {
          bank: 'Kotak Mahindra',
          date: '2025-05-20',
          type: 'Personal Loan'
        }
      ]
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const creditBureauService = new CreditBureauService();

// Production Integration Notes:
/*
1. CIBIL TransUnion API Integration:
   - Endpoint: https://api.cibil.com/v1/score
   - Required: PAN, DOB, Mobile, Email
   - Documentation: https://developer.cibil.com/

2. Experian API Integration:
   - Endpoint: https://sandbox.experian.com/consumerservices/credit-profile
   - Required: PAN, Full Name, DOB, Address
   - Documentation: https://developer.experian.com/

3. Equifax API Integration:
   - Endpoint: https://api.equifax.co.in/v1/credit-report
   - Required: PAN, Mobile OTP verification
   - Documentation: https://developer.equifax.co.in/

4. CRIF High Mark API:
   - Endpoint: https://api.crifhighmark.com/credit-score
   - Required: PAN, KYC documents
   - Documentation: https://developer.crifhighmark.com/

5. Security Considerations:
   - Store API keys in environment variables
   - Implement rate limiting
   - Use HTTPS for all API calls
   - Encrypt sensitive data at rest
   - Implement proper error handling and logging
   - Add user consent management for data sharing

6. Compliance Requirements:
   - RBI guidelines for credit information sharing
   - Data localization requirements
   - User consent for credit report access
   - Audit trails for all API calls
*/
