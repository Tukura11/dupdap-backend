import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../database/entities/payment.entity';
import * as QRCode from 'qrcode';

import { PaymentMetrics } from './payment.metrics';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly metrics: PaymentMetrics,
  ) { }

  async getPaymentDetails(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async getPaymentStatus(id: string): Promise<{ status: PaymentStatus }> {
    const payment = await this.getPaymentDetails(id);
    return { status: payment.status };
  }

  async generateQR(id: string): Promise<Buffer> {
    const payment = await this.getPaymentDetails(id);
    const url = `https://example.com/payment/${id}`;
    return QRCode.toBuffer(url);
  }

  // Alias for generateQR to fix controller error - matches EXPECTED return type now
  async generateQrCode(id: string): Promise<{ qrCodeData: string; paymentUrl: string }> {
    const buffer = await this.generateQR(id);
    return {
      qrCodeData: buffer.toString('base64'),
      paymentUrl: `https://example.com/payment/${id}`
    };
  }

  async handleNotify(id: string, data: any): Promise<void> {
    const payment = await this.getPaymentDetails(id);
    if (data.status) {
      payment.status = data.status;
      await this.paymentRepository.save(payment);

      if (data.status === PaymentStatus.COMPLETED) {
        this.metrics.incrementPaymentProcessed(payment.currency || 'USD');
      } else if (data.status === PaymentStatus.FAILED) {
        this.metrics.incrementPaymentFailed(
          payment.currency || 'USD',
          data.reason || 'unknown',
        );
      }
    }
  }

  getNetworks(): string[] {
    return ['ethereum', 'polygon', 'bsc'];
  }

  getExchangeRates(): Record<string, number> {
    return {
      'ETH/USD': 3000,
      'MATIC/USD': 1.5,
      'BNB/USD': 400,
    };
  }

  // Stubs for missing methods
  async createPayment(dto: any): Promise<any> {
    return { id: 'stub', ...dto };
  }

  async getPayments(filters: any): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 10
    };
  }

  async getPaymentById(id: string): Promise<Payment> {
    return this.getPaymentDetails(id);
  }

  async cancelPayment(id: string, reason?: string): Promise<any> {
    return { status: PaymentStatus.FAILED, cancellationReason: reason };
  }

  async getPaymentByReference(reference: string): Promise<Payment> {
    // Mock implementation since reference column doesn't exist
    const payment = await this.paymentRepository.findOne({ where: { id: reference } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async generateReceipt(id: string): Promise<any> {
    return { id, content: 'Receipt stub' };
  }
}
