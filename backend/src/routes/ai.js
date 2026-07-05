import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

// ────────────────────────────────────────────────────────────────
// SCOPE: What this ticketing tool is allowed to handle
// ────────────────────────────────────────────────────────────────
const ALLOWED_CATEGORIES = [
  'cloud_resource',     // AWS, Azure, GCP resource provisioning
  'access_management',  // IAM, RBAC, permissions, role requests
  'software_request',   // Software install, license, upgrade
  'network_request',    // VPN, firewall, DNS, domain, IP, port
  'infra_request',      // Server, VM, container, deployment
  'database_request',   // DB creation, migration, backup
  'security_request',   // Vulnerability, patch, audit, compliance
  'general_it',         // General IT support, help desk
];

const OUT_OF_SCOPE = [
  { pattern: /\b(salary|payroll|compensation|bonus|raise)\b/i, category: 'HR / Payroll', suggestion: 'Please contact the HR department or use the HR portal.' },
  { pattern: /\b(leave|vacation|pto|time.?off|sick\s*day)\b/i, category: 'HR / Leave Management', suggestion: 'Please use the HR leave management system.' },
  { pattern: /\b(reimburs|expense\s*claim|travel\s*claim)\b/i, category: 'Finance / Expense', suggestion: 'Please use the finance portal for expense claims.' },
  { pattern: /\b(office\s*supplies|furniture|desk|chair|stationery)\b/i, category: 'Facilities / Office Supplies', suggestion: 'Please contact the facilities team.' },
  { pattern: /\b(parking|cafeteria|canteen|meal|food)\b/i, category: 'Facilities / General', suggestion: 'Please contact the facilities/admin team.' },
  { pattern: /\b(complaint|grievance|harassment|misconduct)\b/i, category: 'HR / Employee Relations', suggestion: 'Please contact HR or the employee helpline.' },
  { pattern: /\b(interview|recruit|hiring|candidate|resume)\b/i, category: 'HR / Recruitment', suggestion: 'Please contact the recruitment team.' },
  { pattern: /\b(training\s*room|conference\s*room|meeting\s*room|book.*(room|hall))\b/i, category: 'Facilities / Room Booking', suggestion: 'Please use the room booking system.' },
  { pattern: /\b(legal|contract|nda|agreement|lawsuit)\b/i, category: 'Legal', suggestion: 'Please contact the legal department.' },
  { pattern: /\b(marketing|campaign|advertisement|social\s*media\s*post)\b/i, category: 'Marketing', suggestion: 'Please contact the marketing department.' },
  // ── Personal / Entertainment / Non-IT ──
  { pattern: /\b(football|cricket|basketball|baseball|soccer|tennis|hockey|golf|rugby|badminton|volleyball|swimming|marathon|sports?\s*ticket|match\s*ticket|game\s*ticket|stadium|movie|cinema|concert|show\s*ticket|event\s*ticket|theme\s*park|amusement)\b/i, category: 'Personal / Entertainment', suggestion: 'This is a personal/entertainment request. This system only handles IT-related tickets.' },
  { pattern: /\b(book\s*(ticket|flight|hotel|cab|taxi|uber|ola|bus|train|travel)|travel\s*booking|holiday|vacation\s*plan|trip\s*plan|tour|honeymoon)\b/i, category: 'Personal / Travel', suggestion: 'Please use a travel booking platform. This system handles IT requests only.' },
  { pattern: /\b(order\s*(food|pizza|lunch|dinner|breakfast|grocery|groceries|clothes|dress|shirt)|zomato|swiggy|amazon|flipkart|shopping|buy\s+(?!license|software|server|domain))\b/i, category: 'Personal / Shopping', suggestion: 'This is a personal shopping request. This system only handles IT-related tickets.' },
  { pattern: /\b(birthday|anniversary|party|celebration|wedding|gift|decoration|festival|diwali|christmas|new\s*year|valentine)\b/i, category: 'Personal / Events', suggestion: 'This is a personal event. This system only handles IT-related tickets.' },
  { pattern: /\b(cook|recipe|restaurant|café|coffee\s*shop|gym|workout|exercise|yoga|meditation|doctor|hospital|clinic|medicine|prescription|pharmacy)\b/i, category: 'Personal / Lifestyle', suggestion: 'This is a personal/lifestyle request. This system only handles IT-related tickets.' },
  { pattern: /\b(rent|house|apartment|flat|real\s*estate|mortgage|loan|insurance|bank\s*account|credit\s*card|invest|stock|mutual\s*fund|crypto)\b/i, category: 'Personal / Finance', suggestion: 'This is a personal finance matter. This system only handles IT-related tickets.' },
  { pattern: /\b(school|college|university|admission|exam|tuition|homework|assignment|course\s*registration)\b/i, category: 'Personal / Education', suggestion: 'This is an education-related request. This system only handles IT-related tickets.' },
  { pattern: /\b(plumber|electrician|carpenter|mechanic|car\s*service|bike\s*service|laundry|cleaning|pest\s*control|gardening)\b/i, category: 'Personal / Home Services', suggestion: 'This is a home service request. This system only handles IT-related tickets.' },
];

// ────────────────────────────────────────────────────────────────
// VALIDATORS: Resource-specific naming & config validators
// ────────────────────────────────────────────────────────────────
const VALIDATORS = {
  // ── AWS ──
  s3_bucket: {
    label: 'AWS S3 Bucket',
    rules: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length < 3) v.push('Must be at least 3 characters long.');
      if (n.length > 63) v.push('Must not exceed 63 characters.');
      if (/[A-Z]/.test(n)) v.push(`Must NOT contain uppercase letters. Found: "${n}"`);
      if (/\s/.test(n)) v.push(`Must NOT contain spaces. Found: "${n}"`);
      if (/[^a-z0-9.\-]/.test(n)) v.push(`Only lowercase letters, numbers, hyphens (-) and periods (.) allowed.`);
      if (/^[^a-z0-9]/.test(n)) v.push('Must start with a lowercase letter or number.');
      if (/[^a-z0-9]$/.test(n)) v.push('Must end with a lowercase letter or number.');
      if (/\.\./.test(n)) v.push('Must not have consecutive periods (..).');
      if (/^\d+\.\d+\.\d+\.\d+$/.test(n)) v.push('Must not look like an IP address.');
      if (/^xn--/.test(n)) v.push('Must not start with "xn--".');
      if (/-s3alias$/.test(n)) v.push('Must not end with "-s3alias".');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9.\-]/g,'').replace(/\.{2,}/g,'.').replace(/^[^a-z0-9]+/,'').replace(/[^a-z0-9]+$/,'').substring(0,63);
      return { violations: v, suggested, requirements: [
        'Length 3–63 characters','Only lowercase a-z, 0-9, hyphen, period',
        'Start & end with letter/number','No uppercase','No spaces/underscores',
        'No IP address format','No "xn--" prefix','Globally unique across all AWS accounts',
      ]};
    },
  },
  ec2_instance: {
    label: 'AWS EC2 Instance (Name tag)',
    rules: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 256) v.push('Tag value must not exceed 256 characters.');
      if (/^\s|\s$/.test(name)) v.push('Must not have leading or trailing whitespace.');
      if (/^aws:/i.test(n)) v.push('Tag value must not start with "aws:" (reserved prefix).');
      const suggested = n.replace(/^aws:/i,'').trim().substring(0,256);
      return { violations: v, suggested, requirements: [
        'Max 256 characters','No leading/trailing whitespace',
        'Cannot start with "aws:" prefix','UTF-8 characters allowed',
        'Case-sensitive','Follow company tagging convention (env-project-role)',
      ]};
    },
  },
  iam_user: {
    label: 'AWS IAM User',
    rules: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 64) v.push('Must not exceed 64 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9+=,.@_-]/.test(n)) v.push('Only alphanumeric and +=,.@_- characters allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9+=,.@_-]/g,'').substring(0,64);
      return { violations: v, suggested, requirements: [
        'Length 1–64 characters','Alphanumeric + +=,.@_- only',
        'No spaces','Case-sensitive','Must be unique within the AWS account',
      ]};
    },
  },
  iam_role: {
    label: 'AWS IAM Role',
    rules: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 64) v.push('Must not exceed 64 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9+=,.@_-]/.test(n)) v.push('Only alphanumeric and +=,.@_- characters allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9+=,.@_-]/g,'').substring(0,64);
      return { violations: v, suggested, requirements: [
        'Length 1–64 characters','Alphanumeric + +=,.@_- only',
        'No spaces','Must be unique within the AWS account',
      ]};
    },
  },
  iam_policy: {
    label: 'AWS IAM Policy',
    rules: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 128) v.push('Must not exceed 128 characters.');
      if (/[^a-zA-Z0-9+=,.@_-]/.test(n)) v.push('Only alphanumeric and +=,.@_- characters allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9+=,.@_-]/g,'').substring(0,128);
      return { violations: v, suggested, requirements: [
        'Length 1–128 characters','Alphanumeric + +=,.@_- only','No spaces',
      ]};
    },
  },
  lambda_function: {
    label: 'AWS Lambda Function',
    rules: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 64) v.push('Must not exceed 64 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9_-]/.test(n)) v.push('Only letters, numbers, hyphens (-) and underscores (_) allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9_-]/g,'').substring(0,64);
      return { violations: v, suggested, requirements: [
        'Length 1–64 characters','Letters, numbers, hyphens, underscores only',
        'No spaces','Case-sensitive',
      ]};
    },
  },
  rds_instance: {
    label: 'AWS RDS DB Instance',
    rules: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 63) v.push('Must not exceed 63 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[A-Z]/.test(n)) v.push('Must be lowercase.');
      if (/[^a-z0-9-]/.test(n)) v.push('Only lowercase letters, numbers, and hyphens allowed.');
      if (/^-|-$/.test(n)) v.push('Must not begin or end with a hyphen.');
      if (/--/.test(n)) v.push('Must not contain two consecutive hyphens.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-{2,}/g,'-').replace(/^-+|-+$/g,'').substring(0,63);
      return { violations: v, suggested, requirements: [
        'Length 1–63 characters','Lowercase letters, numbers, hyphens only',
        'No consecutive hyphens','Cannot start/end with hyphen',
      ]};
    },
  },
  dynamodb_table: {
    label: 'AWS DynamoDB Table',
    rules: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length < 3) v.push('Must be at least 3 characters.');
      if (n.length > 255) v.push('Must not exceed 255 characters.');
      if (/[^a-zA-Z0-9._-]/.test(n)) v.push('Only letters, numbers, underscores (_), hyphens (-) and periods (.) allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9._-]/g,'').substring(0,255);
      return { violations: v, suggested, requirements: [
        'Length 3–255 characters','Letters, numbers, underscores, hyphens, periods',
        'No spaces','Case-sensitive',
      ]};
    },
  },
  sqs_queue: {
    label: 'AWS SQS Queue',
    rules: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-queues.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 80) v.push('Must not exceed 80 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9_-]/.test(n)) v.push('Only alphanumeric characters, hyphens (-) and underscores (_) allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      if (n.endsWith('.fifo') && !/\.fifo$/.test(n)) v.push('FIFO queue names must end with .fifo suffix.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9_-]/g,'').substring(0,80);
      return { violations: v, suggested, requirements: [
        'Length 1–80 characters','Alphanumeric, hyphens, underscores only',
        'FIFO queues must end with .fifo','No spaces',
      ]};
    },
  },
  sns_topic: {
    label: 'AWS SNS Topic',
    rules: 'https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 256) v.push('Must not exceed 256 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9_-]/.test(n)) v.push('Only alphanumeric characters, hyphens (-) and underscores (_) allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9_-]/g,'').substring(0,256);
      return { violations: v, suggested, requirements: [
        'Length 1–256 characters','Alphanumeric, hyphens, underscores only','No spaces',
      ]};
    },
  },
  cloudformation_stack: {
    label: 'AWS CloudFormation Stack',
    rules: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-using-console-create-stack-parameters.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 128) v.push('Must not exceed 128 characters.');
      if (!/^[a-zA-Z]/.test(n)) v.push('Must begin with a letter.');
      if (/[^a-zA-Z0-9-]/.test(n)) v.push('Only letters, numbers, and hyphens allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'').replace(/^[^a-zA-Z]+/,'').substring(0,128);
      return { violations: v, suggested, requirements: [
        'Max 128 characters','Must start with a letter',
        'Letters, numbers, hyphens only','No spaces',
      ]};
    },
  },
  ecs_cluster: {
    label: 'AWS ECS Cluster',
    rules: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-query-language.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 255) v.push('Must not exceed 255 characters.');
      if (!/^[a-zA-Z]/.test(n)) v.push('Must begin with a letter.');
      if (/[^a-zA-Z0-9_-]/.test(n)) v.push('Only letters, numbers, hyphens, and underscores allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9_-]/g,'').replace(/^[^a-zA-Z]+/,'').substring(0,255);
      return { violations: v, suggested, requirements: [
        'Max 255 characters','Must start with a letter',
        'Letters, numbers, hyphens, underscores only','No spaces',
      ]};
    },
  },
  eks_cluster: {
    label: 'AWS EKS Cluster',
    rules: 'https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 100) v.push('Must not exceed 100 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9_-]/.test(n)) v.push('Only alphanumeric, hyphens, underscores allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9_-]/g,'').substring(0,100);
      return { violations: v, suggested, requirements: [
        'Length 1–100 characters','Alphanumeric, hyphens, underscores','No spaces',
      ]};
    },
  },
  ecr_repository: {
    label: 'AWS ECR Repository',
    rules: 'https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-create.html',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 256) v.push('Must not exceed 256 characters.');
      if (n.length < 2) v.push('Must be at least 2 characters.');
      if (/[^a-z0-9._/-]/.test(n)) v.push('Only lowercase letters, numbers, periods, hyphens, underscores, and forward slashes allowed.');
      if (/[A-Z]/.test(n)) v.push('Must be lowercase.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9._/-]/g,'').substring(0,256);
      return { violations: v, suggested, requirements: [
        'Length 2–256 characters','Lowercase only','Letters, numbers, ._/- only','No spaces',
      ]};
    },
  },

  // ── Azure ──
  azure_resource_group: {
    label: 'Azure Resource Group',
    rules: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 90) v.push('Must not exceed 90 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9._()-]/.test(n)) v.push('Only alphanumeric, periods, underscores, hyphens, and parentheses allowed.');
      if (/\.$/.test(n)) v.push('Must not end with a period.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9._()-]/g,'').replace(/\.$/,'').substring(0,90);
      return { violations: v, suggested, requirements: [
        'Length 1–90 characters','Alphanumeric, periods, underscores, hyphens, parentheses',
        'Cannot end with period','No spaces',
      ]};
    },
  },
  azure_storage_account: {
    label: 'Azure Storage Account',
    rules: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview#storage-account-name',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length < 3) v.push('Must be at least 3 characters.');
      if (n.length > 24) v.push('Must not exceed 24 characters.');
      if (/[^a-z0-9]/.test(n)) v.push('Only lowercase letters and numbers allowed (no hyphens, underscores, or special chars).');
      if (/[A-Z]/.test(n)) v.push('Must be lowercase only.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'').substring(0,24);
      return { violations: v, suggested, requirements: [
        'Length 3–24 characters','Lowercase letters and numbers ONLY',
        'No hyphens, underscores, or special characters','Globally unique',
      ]};
    },
  },
  azure_vm: {
    label: 'Azure Virtual Machine',
    rules: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules',
    validate(name) {
      const v = []; const n = name.trim();
      const isWindows = n.length <= 15;
      const maxLen = isWindows ? 15 : 64;
      if (n.length > 64) v.push('Must not exceed 64 characters (Linux) or 15 characters (Windows).');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-zA-Z0-9_.-]/.test(n)) v.push('Only alphanumeric, periods, underscores, and hyphens allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      if (/^[_.-]|[_.-]$/.test(n)) v.push('Must not start or end with period, underscore, or hyphen.');
      const suggested = n.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9_.-]/g,'').replace(/^[_.-]+|[_.-]+$/g,'').substring(0,maxLen);
      return { violations: v, suggested, requirements: [
        'Length 1–64 (Linux) or 1–15 (Windows)','Alphanumeric, periods, underscores, hyphens',
        'No spaces','Cannot start/end with special characters',
      ]};
    },
  },

  // ── GCP ──
  gcp_project: {
    label: 'GCP Project ID',
    rules: 'https://cloud.google.com/resource-manager/docs/creating-managing-projects',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length < 6) v.push('Must be at least 6 characters.');
      if (n.length > 30) v.push('Must not exceed 30 characters.');
      if (/[A-Z]/.test(n)) v.push('Must be lowercase only.');
      if (/[^a-z0-9-]/.test(n)) v.push('Only lowercase letters, numbers, and hyphens allowed.');
      if (!/^[a-z]/.test(n)) v.push('Must start with a lowercase letter.');
      if (/-$/.test(n)) v.push('Must not end with a hyphen.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/^[^a-z]+/,'').replace(/-+$/,'').substring(0,30);
      return { violations: v, suggested, requirements: [
        'Length 6–30 characters','Lowercase letters, numbers, hyphens only',
        'Must start with letter','Cannot end with hyphen','Globally unique',
      ]};
    },
  },
  gcp_bucket: {
    label: 'GCP Cloud Storage Bucket',
    rules: 'https://cloud.google.com/storage/docs/buckets#naming',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length < 3) v.push('Must be at least 3 characters.');
      if (n.length > 63) v.push('Must not exceed 63 characters.');
      if (/[A-Z]/.test(n)) v.push('Must be lowercase only.');
      if (/[^a-z0-9._-]/.test(n)) v.push('Only lowercase letters, numbers, hyphens, underscores, and periods allowed.');
      if (/^[^a-z0-9]/.test(n)) v.push('Must start with a letter or number.');
      if (/[^a-z0-9]$/.test(n)) v.push('Must end with a letter or number.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      if (/^goog|google/.test(n)) v.push('Must not contain "google" or start with "goog".');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9._-]/g,'').replace(/^[^a-z0-9]+/,'').replace(/[^a-z0-9]+$/,'').substring(0,63);
      return { violations: v, suggested, requirements: [
        'Length 3–63 characters','Lowercase, numbers, hyphens, underscores, periods',
        'Start/end with letter or number','No "google" or "goog" prefix','Globally unique',
      ]};
    },
  },

  // ── Docker / Kubernetes ──
  docker_image: {
    label: 'Docker Image Name',
    rules: 'https://docs.docker.com/reference/cli/docker/image/tag/',
    validate(name) {
      const v = []; const n = name.trim();
      const nameOnly = n.split(':')[0];
      if (/[A-Z]/.test(nameOnly)) v.push('Image name must be lowercase.');
      if (/[^a-z0-9._/-]/.test(nameOnly)) v.push('Only lowercase letters, numbers, periods, hyphens, underscores, and slashes allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      if (nameOnly.length > 255) v.push('Name component must not exceed 255 characters.');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9._/:-]/g,'');
      return { violations: v, suggested, requirements: [
        'Lowercase only (name part)','Letters, numbers, ._/- allowed in name',
        'Tag after colon: alphanumeric, periods, hyphens','No spaces',
      ]};
    },
  },
  k8s_namespace: {
    label: 'Kubernetes Namespace',
    rules: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/names/',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 63) v.push('Must not exceed 63 characters.');
      if (n.length < 1) v.push('Must be at least 1 character.');
      if (/[^a-z0-9-]/.test(n)) v.push('Only lowercase letters, numbers, and hyphens allowed.');
      if (/[A-Z]/.test(n)) v.push('Must be lowercase.');
      if (/^-|-$/.test(n)) v.push('Must not start or end with a hyphen.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'').substring(0,63);
      return { violations: v, suggested, requirements: [
        'Length 1–63 characters','Lowercase letters, numbers, hyphens only',
        'Cannot start/end with hyphen','RFC 1123 DNS label','No spaces',
      ]};
    },
  },

  // ── Networking ──
  dns_record: {
    label: 'DNS Hostname / Domain',
    rules: 'https://www.rfc-editor.org/rfc/rfc1035',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 253) v.push('Full domain name must not exceed 253 characters.');
      const labels = n.split('.');
      labels.forEach((label, i) => {
        if (label.length > 63) v.push(`Label "${label}" exceeds 63 characters.`);
        if (label.length === 0 && i < labels.length - 1) v.push('Empty label (consecutive dots) not allowed.');
      });
      if (/[^a-zA-Z0-9.-]/.test(n)) v.push('Only letters, numbers, hyphens, and periods allowed.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      if (/_/.test(n) && !/^_/.test(n)) v.push('Underscores generally not allowed in hostnames (except SRV/TXT records).');
      const suggested = n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9.-]/g,'');
      return { violations: v, suggested, requirements: [
        'Max 253 characters total','Each label max 63 characters',
        'Letters, numbers, hyphens, periods only','RFC 1035 compliant','No spaces',
      ]};
    },
  },
  ip_address: {
    label: 'IP Address',
    rules: 'RFC 791 (IPv4) / RFC 8200 (IPv6)',
    validate(name) {
      const v = []; const n = name.trim();
      const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/\d{1,2})?$/;
      const ipv6 = /^[0-9a-fA-F:]+$/;
      if (/\s/.test(n)) { v.push('Must NOT contain spaces.'); }
      else if (ipv4.test(n.split('/')[0])) {
        const parts = n.split('/')[0].split('.').map(Number);
        parts.forEach((p, i) => { if (p < 0 || p > 255) v.push(`Octet ${i+1} (${p}) must be 0–255.`); });
        if (n.includes('/')) {
          const cidr = parseInt(n.split('/')[1]);
          if (cidr < 0 || cidr > 32) v.push(`CIDR prefix /${cidr} must be 0–32.`);
        }
      } else if (ipv6.test(n)) {
        // basic check
      } else {
        v.push('Not a valid IPv4 or IPv6 address format.');
      }
      return { violations: v, suggested: n.trim(), requirements: [
        'IPv4: four octets 0–255 separated by periods','CIDR: /0 to /32',
        'IPv6: hexadecimal groups separated by colons','No spaces',
      ]};
    },
  },
  port_number: {
    label: 'Network Port',
    rules: 'IANA Port Number Registry',
    validate(name) {
      const v = []; const n = name.trim();
      const port = parseInt(n);
      if (isNaN(port)) v.push('Port must be a number.');
      else {
        if (port < 0 || port > 65535) v.push('Port must be between 0 and 65535.');
        if (port >= 0 && port <= 1023) v.push(`Port ${port} is a well-known/system port (0-1023). May require elevated privileges.`);
        if ([80,443,22,21,25,53,3306,5432,6379,27017,8080,8443].includes(port)) v.push(`Port ${port} is commonly used by existing services. Verify no conflict.`);
      }
      return { violations: v, suggested: n, requirements: [
        'Range: 0–65535','0–1023: system/well-known ports (require root)',
        '1024–49151: registered ports','49152–65535: dynamic/private ports',
      ]};
    },
  },
  cidr_block: {
    label: 'CIDR Block',
    rules: 'RFC 4632',
    validate(name) {
      const v = []; const n = name.trim();
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      const cidrMatch = n.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
      if (!cidrMatch) {
        v.push('Must be in format x.x.x.x/n (e.g. 10.0.0.0/16).');
      } else {
        const octets = [cidrMatch[1],cidrMatch[2],cidrMatch[3],cidrMatch[4]].map(Number);
        octets.forEach((o, i) => { if (o > 255) v.push(`Octet ${i+1} (${o}) must be 0–255.`); });
        const prefix = parseInt(cidrMatch[5]);
        if (prefix < 0 || prefix > 32) v.push(`Prefix /${prefix} must be 0–32.`);
        if (prefix < 16) v.push(`Warning: /${prefix} is a very large range (${Math.pow(2, 32-prefix)} IPs). Verify this is intended.`);
      }
      return { violations: v, suggested: n, requirements: [
        'Format: x.x.x.x/n','Each octet: 0–255','Prefix: /0 to /32',
        'Common VPC: /16 (65,536 IPs)','Common subnet: /24 (256 IPs)',
      ]};
    },
  },

  // ── Database ──
  database_name: {
    label: 'Database Name',
    rules: 'General SQL naming conventions',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length > 64) v.push('Should not exceed 64 characters (MySQL limit).');
      if (/^\d/.test(n)) v.push('Should not start with a number.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces. Use underscores instead.');
      if (/[^a-zA-Z0-9_$]/.test(n)) v.push('Only letters, numbers, underscores, and $ allowed.');
      const reserved = ['select','insert','update','delete','drop','create','alter','table','database','index','from','where','join','group','order','by','having','union','into','values','set','null','and','or','not','in','is','like','between','exists','case','when','then','else','end','as','on','primary','key','foreign','references','constraint','default','check','unique'];
      if (reserved.includes(n.toLowerCase())) v.push(`"${n}" is a SQL reserved word. Choose a different name.`);
      const suggested = n.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_$]/g,'').replace(/^\d+/,'');
      return { violations: v, suggested, requirements: [
        'Max 64 characters (MySQL) / 63 (PostgreSQL)','Letters, numbers, underscores',
        'Must start with a letter or underscore','No SQL reserved words','No spaces',
      ]};
    },
  },

  // ── Email / Username ──
  email_address: {
    label: 'Email Address',
    rules: 'RFC 5322',
    validate(name) {
      const v = []; const n = name.trim();
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      if (!/@/.test(n)) v.push('Must contain an @ symbol.');
      else {
        const [local, domain] = n.split('@');
        if (!local) v.push('Must have a local part before @.');
        if (local && local.length > 64) v.push('Local part must not exceed 64 characters.');
        if (!domain) v.push('Must have a domain part after @.');
        if (domain && !/\./.test(domain)) v.push('Domain must contain at least one period (e.g. company.com).');
        if (domain && /[^a-zA-Z0-9.-]/.test(domain)) v.push('Domain contains invalid characters.');
      }
      return { violations: v, suggested: n, requirements: [
        'Format: local@domain.tld','Local part: max 64 chars',
        'Domain: valid hostname with TLD','No spaces',
      ]};
    },
  },
  username: {
    label: 'Username / Login',
    rules: 'Common system username conventions',
    validate(name) {
      const v = []; const n = name.trim();
      if (n.length < 3) v.push('Should be at least 3 characters.');
      if (n.length > 32) v.push('Should not exceed 32 characters.');
      if (/\s/.test(n)) v.push('Must NOT contain spaces.');
      if (/^[^a-zA-Z]/.test(n)) v.push('Should start with a letter.');
      if (/[^a-zA-Z0-9._-]/.test(n)) v.push('Only letters, numbers, periods, underscores, and hyphens recommended.');
      const suggested = n.replace(/\s+/g,'.').replace(/[^a-zA-Z0-9._-]/g,'').substring(0,32);
      return { violations: v, suggested, requirements: [
        'Length 3–32 characters','Start with a letter','Alphanumeric, periods, underscores, hyphens',
        'No spaces','Case-sensitive on Linux, case-insensitive on Windows',
      ]};
    },
  },
};

// ────────────────────────────────────────────────────────────────
// DETECTION: Identify what the user is asking about
// ────────────────────────────────────────────────────────────────
const RESOURCE_PATTERNS = [
  // AWS
  { pattern: /\bs3\b.*\b(bucket|storage)\b|\b(bucket|storage)\b.*\bs3\b/i, type: 's3_bucket', namePatterns: ['bucket'] },
  { pattern: /\bec2\b|\binstance\b.*\b(launch|create|provision|name)\b/i, type: 'ec2_instance', namePatterns: ['instance','server','vm'] },
  { pattern: /\biam\b.*\buser\b|\bcreate\b.*\buser\b.*\baws\b/i, type: 'iam_user', namePatterns: ['user'] },
  { pattern: /\biam\b.*\brole\b|\bcreate\b.*\brole\b/i, type: 'iam_role', namePatterns: ['role'] },
  { pattern: /\biam\b.*\bpolicy\b|\bcreate\b.*\bpolicy\b/i, type: 'iam_policy', namePatterns: ['policy'] },
  { pattern: /\blambda\b.*\b(function|create)\b|\b(function|create)\b.*\blambda\b/i, type: 'lambda_function', namePatterns: ['function','lambda'] },
  { pattern: /\brds\b|\brelational\s*database\b|\bdb\s*instance\b/i, type: 'rds_instance', namePatterns: ['db','database','instance','rds'] },
  { pattern: /\bdynamo\s*db\b|\bdynamo\b.*\btable\b/i, type: 'dynamodb_table', namePatterns: ['table'] },
  { pattern: /\bsqs\b|\b(message|simple)\s*queue\b/i, type: 'sqs_queue', namePatterns: ['queue'] },
  { pattern: /\bsns\b|\bnotification\b.*\btopic\b|\btopic\b.*\bsns\b/i, type: 'sns_topic', namePatterns: ['topic'] },
  { pattern: /\bcloudformation\b|\bcfn\b|\bstack\b.*\b(create|deploy)\b/i, type: 'cloudformation_stack', namePatterns: ['stack'] },
  { pattern: /\becs\b.*\bcluster\b|\bcontainer\b.*\bcluster\b/i, type: 'ecs_cluster', namePatterns: ['cluster'] },
  { pattern: /\beks\b|\bkubernetes\b.*\bcluster\b.*\baws\b/i, type: 'eks_cluster', namePatterns: ['cluster'] },
  { pattern: /\becr\b|\bcontainer\s*registry\b.*\baws\b/i, type: 'ecr_repository', namePatterns: ['repository','repo'] },
  // Azure
  { pattern: /\bazure\b.*\bresource\s*group\b|\bresource\s*group\b.*\bazure\b/i, type: 'azure_resource_group', namePatterns: ['group','resource group'] },
  { pattern: /\bazure\b.*\bstorage\s*account\b|\bstorage\s*account\b/i, type: 'azure_storage_account', namePatterns: ['account','storage'] },
  { pattern: /\bazure\b.*\b(vm|virtual\s*machine)\b/i, type: 'azure_vm', namePatterns: ['vm','machine','server'] },
  // GCP
  { pattern: /\bgcp\b.*\bproject\b|\bgoogle\s*cloud\b.*\bproject\b/i, type: 'gcp_project', namePatterns: ['project'] },
  { pattern: /\bgcp\b.*\bbucket\b|\bgoogle\s*(cloud)?\s*storage\b/i, type: 'gcp_bucket', namePatterns: ['bucket'] },
  // Docker / K8s
  { pattern: /\bdocker\b.*\bimage\b|\bcontainer\b.*\bimage\b|\bbuild\b.*\bimage\b/i, type: 'docker_image', namePatterns: ['image'] },
  { pattern: /\bnamespace\b.*\b(k8s|kubernetes|create)\b|\bk8s\b.*\bnamespace\b/i, type: 'k8s_namespace', namePatterns: ['namespace'] },
  // Networking
  { pattern: /\bdns\b|\bdomain\b|\bhostname\b|\bsubdomain\b|\bfqdn\b/i, type: 'dns_record', namePatterns: ['domain','hostname','subdomain','dns','record'] },
  { pattern: /\b(ip\s*address|assign\s*ip|static\s*ip|elastic\s*ip)\b/i, type: 'ip_address', namePatterns: ['ip','address'] },
  { pattern: /\bport\b.*\b(open|allow|number|assign|configure|request)\b|\b(open|allow|assign)\b.*\bport\b/i, type: 'port_number', namePatterns: ['port'] },
  { pattern: /\bcidr\b|\bsubnet\b.*\b(range|block|create)\b|\bvpc\b.*\b(cidr|range)\b/i, type: 'cidr_block', namePatterns: ['cidr','subnet','range','block'] },
  // Database
  { pattern: /\b(create|new|provision)\b.*\bdatabase\b|\bdatabase\b.*\b(name|create)\b/i, type: 'database_name', namePatterns: ['database','db','schema'] },
  // Email / User
  { pattern: /\bemail\s*(address|id|account)?\b.*\b(create|new|set\s*up)\b|\b(create|new|set\s*up)\b.*\bemail\b/i, type: 'email_address', namePatterns: ['email','address'] },
  { pattern: /\b(create|new|provision)\b.*\b(user\s*name|username|login|account)\b|\b(username|login)\b.*\b(create|set\s*up|new)\b/i, type: 'username', namePatterns: ['username','user','login','account'] },
];

/**
 * Detect the resource type from the description.
 */
const detectResource = (description) => {
  for (const rp of RESOURCE_PATTERNS) {
    if (rp.pattern.test(description)) {
      return { type: rp.type, nameHints: rp.namePatterns };
    }
  }
  return null;
};

/**
 * Extract resource name from description using intelligent patterns.
 */
const extractResourceName = (description, nameHints = []) => {
  // Build hint-specific patterns
  const hintAlternation = nameHints.length ? nameHints.join('|') : 'name';

  const patterns = [
    // "name: 'xyz'"  or  "name = 'xyz'"
    new RegExp(`(?:${hintAlternation}|name|named|called)\\s*[:=]\\s*["'\`]([^"'\`]+)["'\`]`, 'i'),
    // "name: xyz" (to end of line)
    new RegExp(`(?:${hintAlternation}|name|named|called)\\s*[:=]\\s*([^\\s"'\`,;]+)`, 'i'),
    // quoted strings
    /["'`]([^"'`\s]{2,})["'`]/,
    // "with this name: xyz" or "with name xyz"
    /(?:with\s+(?:this\s+)?(?:name|id))\s*[:=]?\s*["'`]?([^"'`\n,;]+?)["'`]?\s*$/i,
  ];

  for (const p of patterns) {
    const match = description.match(p);
    if (match && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }
  return null;
};

/**
 * Check if request is within the ticketing tool's scope.
 */
const checkScope = (description) => {
  for (const oos of OUT_OF_SCOPE) {
    if (oos.pattern.test(description)) {
      return {
        inScope: false,
        category: oos.category,
        suggestion: oos.suggestion,
      };
    }
  }
  return { inScope: true };
};

// ────────────────────────────────────────────────────────────────
// GEMINI AI — Real AI-powered note generation
// ────────────────────────────────────────────────────────────────
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('🤖 Gemini AI model initialized (gemini-2.0-flash)');
} else {
  console.log('⚠️  GEMINI_API_KEY not set — using local rule-based AI generation');
}

// ────────────────────────────────────────────────────────────────
// COMPLETENESS: Determine if a request has enough detail
// ────────────────────────────────────────────────────────────────
function assessCompleteness(description) {
  const words = description.trim().split(/\s+/);
  const issues = [];

  // Too short to be actionable
  if (words.length < 8) {
    issues.push('very_short');
  }

  // Check for vague database requests
  if (/\b(table|database|db|schema)\b/i.test(description)) {
    if (!/\b(column|field|schema|structure|type|varchar|int|text|boolean|primary\s*key|foreign\s*key)\b/i.test(description)) {
      issues.push('missing_db_schema');
    }
    if (!/\b(mysql|postgres|postgresql|oracle|mssql|sql\s*server|mongodb|dynamodb|rds|aurora|mariadb|sqlite)\b/i.test(description)) {
      issues.push('missing_db_engine');
    }
    if (!/\b(name|called|named)\b/i.test(description) && !/["'`]/.test(description)) {
      issues.push('missing_db_name');
    }
  }

  // Check for vague access requests
  if (/\b(access|permission|role)\b/i.test(description) && !/\b(to|for|on)\s+\w{3,}/i.test(description)) {
    issues.push('missing_access_target');
  }

  // Check for vague software requests
  if (/\b(install|software|app|application)\b/i.test(description) && !/\b(name|version|license)\b/i.test(description)) {
    if (words.length < 12) issues.push('missing_software_details');
  }

  // Check for vague server/infra requests
  if (/\b(server|vm|virtual\s*machine|instance)\b/i.test(description)) {
    if (!/\b(os|operating|linux|windows|ubuntu|centos|rhel|ami|cpu|ram|memory|storage|disk)\b/i.test(description)) {
      issues.push('missing_server_specs');
    }
  }

  // Check for vague network requests
  if (/\b(vpn|firewall|network|port)\b/i.test(description) && words.length < 10) {
    issues.push('missing_network_details');
  }

  return { isComplete: issues.length === 0, issues };
}

async function generateWithGemini(raw_description, request_type, priority, validationContext) {
  if (!geminiModel) return null;

  const validationInfo = validationContext
    ? `\n\nValidation context: ${JSON.stringify(validationContext)}`
    : '';

  // Assess completeness to guide the AI
  const completeness = assessCompleteness(raw_description);
  const completenessHint = !completeness.isComplete
    ? `\n\nCOMPLETENESS ASSESSMENT: The request appears INCOMPLETE. Missing context areas: ${completeness.issues.join(', ')}. You MUST generate follow-up questions.`
    : '\n\nCOMPLETENESS ASSESSMENT: The request appears to have sufficient detail.';

  const prompt = `You are an expert Senior IT Service Desk Engineer / Solution Architect AI with deep knowledge of:
- Cloud platforms (AWS, Azure, GCP) — services, naming conventions, best practices, IAM policies
- Databases (PostgreSQL, MySQL, MongoDB, Redis, DynamoDB, Oracle, MSSQL) — schema design, normalization, indexing, migrations, backup strategies
- Networking — DNS, VPN, firewalls, load balancers, CDN, CIDR, SSL/TLS, TCP/UDP, routing
- DevOps — CI/CD, Docker, Kubernetes, Terraform, Ansible, Jenkins, GitHub Actions
- Security — OWASP, zero-trust, encryption, key management, IAM, RBAC, secrets management, compliance (SOC2, HIPAA, PCI-DSS)
- Software — licensing, version management, dependency resolution, compatibility
- Infrastructure — servers, VMs, containers, storage (block/object/file), monitoring, logging
- Active Directory, SSO, LDAP, SAML, OAuth, MFA

You work for an enterprise internal IT ticketing system.

═══════════════════════════════════════════════
CRITICAL RULE #1: SPELL CORRECTION
═══════════════════════════════════════════════
ALWAYS check the request for spelling mistakes, grammar issues, and typos.
You MUST return a "spelling_corrections" array in your response.

Examples:
- "craete" → "create"
- "databse" → "database"
- "permisson" → "permission"
- "acess" → "access"
- "configre" → "configure"
- "repositoy" → "repository"

If there are NO spelling mistakes, return an empty array.
Also return "corrected_description" with the cleaned-up version of the original text.

═══════════════════════════════════════════════
CRITICAL RULE #2: ASK FOLLOW-UP QUESTIONS
═══════════════════════════════════════════════
If the request is VAGUE, INCOMPLETE, or MISSING critical details, you MUST generate follow-up questions.
A good IT engineer NEVER proceeds with insufficient information.

Signs of an incomplete request:
- No specific system/resource name mentioned
- Database request without table schema, columns, engine type, or environment
- Access request without specifying WHAT system, WHAT level of access, or WHY
- Server request without OS, specs, region, or purpose
- "Create table" without column definitions, data types, constraints, or relationships
- Network request without source/destination, protocols, or port numbers
- Generic one-liners with no context

Return "follow_up_questions" array with 3-6 SPECIFIC, ACTIONABLE questions.
Each question should have: { "question": "...", "why": "...", "examples": "..." }

═══════════════════════════════════════════════
SCOPE CHECK
═══════════════════════════════════════════════
This system ONLY handles IT-related requests:
- Cloud resource provisioning (AWS, Azure, GCP)
- Access/permission management (IAM, RBAC, Active Directory, SSO)
- Software installation, licenses, upgrades
- Network requests (VPN, firewall, DNS, domains, ports, SSL)
- Infrastructure (servers, VMs, containers, deployments, load balancers)
- Database creation, migration, backup, optimization
- Security (vulnerability scans, patching, audits, compliance, encryption)
- General IT support (hardware issues, troubleshooting, email, printers, monitoring)
- DevOps (CI/CD pipelines, Docker, Kubernetes, deployments)

NOT handled: personal requests, entertainment, sports, travel, food, HR, finance, facilities, shopping, events.

Request Description: "${raw_description}"
Request Type: ${request_type || 'general'}
Priority: ${priority || 'medium'}${validationInfo}${completenessHint}

═══════════════════════════════════════════════
RESPONSE FORMAT (STRICT JSON)
═══════════════════════════════════════════════

If NOT IT-related:
{
  "out_of_scope": true,
  "detected_category": "category name",
  "rejection_reason": "why this isn't IT",
  "suggestion": "where to go instead",
  "spelling_corrections": [{"original": "misspelled", "corrected": "correct"}],
  "corrected_description": "cleaned up version"
}

If IT-related but INCOMPLETE/VAGUE:
{
  "out_of_scope": false,
  "needs_more_info": true,
  "spelling_corrections": [{"original": "misspelled", "corrected": "correct"}],
  "corrected_description": "cleaned up version of the request with spelling fixed",
  "follow_up_questions": [
    {
      "question": "Specific question to ask",
      "why": "Why this information is needed",
      "examples": "Example valid answers"
    }
  ],
  "ai_summary": "Brief summary of what we understand so far",
  "ai_details": "Partial analysis with what we know, clearly stating what's missing",
  "ai_next_action": "Steps that include gathering the missing information first"
}

If IT-related and COMPLETE:
{
  "out_of_scope": false,
  "needs_more_info": false,
  "spelling_corrections": [{"original": "misspelled", "corrected": "correct"}],
  "corrected_description": "cleaned up version",
  "ai_summary": "Concise professional summary (under 150 chars)",
  "ai_details": "Comprehensive technical analysis: requirements, impact, dependencies, security considerations, best practices. 200-500 words with markdown bold headers.",
  "ai_next_action": "Numbered step-by-step action plan (5-8 steps) including verification and communication"
}

Respond ONLY with valid JSON. No markdown code blocks. No extra text outside the JSON.

QUALITY REQUIREMENTS:
- Be professional, specific, and deeply technical
- Show real IT expertise — reference actual tools, commands, best practices
- Include security considerations where applicable
- Reference industry standards (ITIL, ISO 27001, CIS benchmarks where relevant)
- For database requests: mention normalization, indexing, backup strategies
- For access requests: mention principle of least privilege, audit trails
- For cloud requests: mention cost optimization, tagging, region selection
- NEVER generate generic filler text — every sentence must add value
- If the request has spelling errors, ALWAYS catch them`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────
// MAIN ENDPOINT
// ────────────────────────────────────────────────────────────────
router.post('/generate-notes', async (req, res) => {
  try {
    const { raw_description, request_type, priority } = req.body;

    if (!raw_description) {
      return res.status(400).json({ error: 'Raw description is required' });
    }

    const lowerDesc = raw_description.toLowerCase();
    const words = raw_description.split(/\s+/);
    const isUrgent = priority === 'high' || lowerDesc.includes('urgent');

    // ── 1. Scope check ──
    const scopeResult = checkScope(raw_description);

    // ── 2. Resource detection & validation ──
    const detected = detectResource(raw_description);
    let resourceName = null;
    let validationResult = null;
    let resourceType = null;
    let validatorInfo = null;

    if (detected) {
      resourceType = detected.type;
      resourceName = extractResourceName(raw_description, detected.nameHints);
      validatorInfo = VALIDATORS[resourceType];

      if (resourceName && validatorInfo) {
        validationResult = validatorInfo.validate(resourceName);
      }
    }

    const hasValidationIssues = validationResult && validationResult.violations.length > 0;
    const isOutOfScope = !scopeResult.inScope;

    // ── 3. Try Gemini AI for intelligent generation ──
    let geminiResult = null;
    if (!isOutOfScope && geminiModel) {
      const validationCtx = hasValidationIssues
        ? { type: validatorInfo?.label, name: resourceName, violations: validationResult.violations }
        : detected ? { type: validatorInfo?.label, name: resourceName, status: 'valid' } : null;
      geminiResult = await generateWithGemini(raw_description, request_type, priority, validationCtx);

      // If Gemini detected out-of-scope, treat it like a scope block
      if (geminiResult?.out_of_scope) {
        scopeResult.inScope = false;
        scopeResult.category = geminiResult.detected_category || 'Non-IT Request';
        scopeResult.suggestion = geminiResult.suggestion || 'This request is not IT-related. Please contact the appropriate department.';
        // Preserve spelling corrections even for out-of-scope
      }
    }

    // Re-evaluate scope flag after Gemini check
    const isOutOfScopeAfterAI = !scopeResult.inScope;

    // ── Extract spell corrections & follow-up questions ──
    const spellingCorrections = geminiResult?.spelling_corrections || [];
    const correctedDescription = geminiResult?.corrected_description || null;
    const followUpQuestions = geminiResult?.follow_up_questions || [];
    const needsMoreInfo = geminiResult?.needs_more_info || false;

    // ── 4. Build summary ──
    let summary;
    if (isOutOfScopeAfterAI) {
      summary = `🚫 OUT OF SCOPE — This request falls under "${scopeResult.category}" and cannot be handled by this IT ticketing system.`;
    } else if (hasValidationIssues) {
      summary = `⚠️ VALIDATION FAILED — ${validatorInfo.label}: "${resourceName}" violates naming/configuration rules`;
    } else if (validationResult && !hasValidationIssues) {
      summary = geminiResult?.ai_summary || `✅ VALIDATION PASSED — ${validatorInfo.label}: "${resourceName}" meets all requirements`;
    } else if (detected && !resourceName) {
      summary = `ℹ️ ${validatorInfo?.label || detected.type} request detected — No resource name found to validate. Please provide a name.`;
    } else if (geminiResult?.ai_summary) {
      summary = geminiResult.ai_summary;
    } else {
      summary = raw_description.length > 120 ? raw_description.substring(0, 120).trim() + '...' : raw_description;
    }

    // ── 5. Build details ──
    let details = `**Original Request:** ${raw_description}\n\n`;

    if (isOutOfScopeAfterAI) {
      details += `**🚫 OUT OF SCOPE**\n\n`;
      details += `This request has been identified as belonging to: **${scopeResult.category}**\n\n`;
      details += `This IT ticketing tool handles ONLY the following categories:\n`;
      details += `• ☁️ Cloud Resource Provisioning (AWS, Azure, GCP)\n`;
      details += `• 🔐 Access & Permission Management (IAM, RBAC, AD)\n`;
      details += `• 💿 Software Requests (Install, License, Upgrade)\n`;
      details += `• 🌐 Network Requests (VPN, Firewall, DNS, Domain)\n`;
      details += `• 🖥️ Infrastructure Requests (Server, VM, Container)\n`;
      details += `• 🗄️ Database Requests (Create, Migrate, Backup)\n`;
      details += `• 🛡️ Security Requests (Vulnerability, Patch, Audit)\n`;
      details += `• 🔧 General IT Support (Hardware, Troubleshooting)\n\n`;
      details += `**Recommendation:** ${scopeResult.suggestion}\n`;
    } else if (detected && validatorInfo) {
      details += `**Detected Resource Type:** ${validatorInfo.label}\n`;
      if (validatorInfo.rules) details += `**Reference:** ${validatorInfo.rules}\n`;
      details += `**Requested Name/Value:** \`${resourceName || '(not provided)'}\`\n\n`;

      if (hasValidationIssues) {
        details += `**⚠️ VALIDATION FAILED:**\n\n`;
        details += `The value **"${resourceName}"** violates the following rules:\n\n`;
        validationResult.violations.forEach((v, i) => {
          details += `${i + 1}. ❌ ${v}\n`;
        });
        details += `\n**${validatorInfo.label} — Full Naming Requirements:**\n`;
        validationResult.requirements.forEach(r => {
          details += `• ${r}\n`;
        });
        if (validationResult.suggested && validationResult.suggested !== resourceName) {
          details += `\n**✅ Suggested corrected value:** \`${validationResult.suggested}\`\n`;
        }
      } else if (validationResult) {
        details += `**✅ VALIDATION PASSED — All naming rules satisfied.**\n\n`;
        details += `**Rules Checked (${validatorInfo.label}):**\n`;
        validationResult.requirements.forEach(r => {
          details += `• ✅ ${r}\n`;
        });
      } else {
        details += `**ℹ️ No resource name/value was detected in the description.**\n`;
        details += `Please provide the intended name so it can be validated.\n\n`;
        details += `**${validatorInfo.label} — Naming Requirements:**\n`;
        const sample = VALIDATORS[resourceType];
        if (sample) {
          const sampleResult = sample.validate('example');
          sampleResult.requirements.forEach(r => {
            details += `• ${r}\n`;
          });
        }
      }
    } else {
      if (geminiResult?.ai_details) {
        details += geminiResult.ai_details;
      } else {
        details += `**Request Category:** ${request_type ? request_type.charAt(0).toUpperCase() + request_type.slice(1) : 'General'}\n\n`;
        details += `**Impact Assessment:** This request affects ${words.length > 15 ? 'multiple systems and processes' : 'a specific system or process'}. `;
        details += `${isUrgent ? 'Flagged as URGENT — requires immediate attention.' : 'Standard processing timeline applies.'}\n\n`;
        details += `**Dependencies:** ${words.length > 10 ? 'May require coordination with multiple teams.' : 'Self-contained request with minimal dependencies.'}`;
      }
    }

    // Append spelling corrections to details if found
    if (spellingCorrections.length > 0) {
      details += `\n\n**✏️ Spelling Corrections Applied:**\n`;
      spellingCorrections.forEach(sc => {
        details += `• "${sc.original}" → "${sc.corrected}"\n`;
      });
      if (correctedDescription) {
        details += `\n**Corrected Description:** ${correctedDescription}\n`;
      }
    }

    // ── 6. Build next action ──
    let nextAction;
    if (isOutOfScopeAfterAI) {
      nextAction = `DO NOT PROCEED — This request is outside the scope of this ticketing system.\n\n` +
        `Action: Redirect the requestor to the appropriate department.\n` +
        `Category: ${scopeResult.category}\n` +
        `Guidance: ${scopeResult.suggestion}`;
    } else if (hasValidationIssues) {
      nextAction = `ACTION REQUIRED: The ${validatorInfo.label} value "${resourceName}" cannot be used as-is.\n\n` +
        `Steps:\n` +
        `1. Review the ${validationResult.violations.length} validation issue(s) above\n` +
        `2. ${validationResult.suggested !== resourceName ? `Consider using the suggested name: "${validationResult.suggested}"` : 'Correct the name per the requirements listed above'}\n` +
        `3. Confirm the corrected value with the requestor\n` +
        `4. Update the request with the valid name\n` +
        `5. Proceed with provisioning after approval`;
    } else if (validationResult && !hasValidationIssues) {
      nextAction = `"${resourceName}" passes all ${validatorInfo.label} validation rules.\n\n` +
        `Next steps:\n` +
        `1. Verify availability/uniqueness in the target environment\n` +
        `2. Confirm configuration requirements (region, permissions, etc.)\n` +
        `3. Proceed with provisioning per company standards\n` +
        `4. Document the resource in the asset registry\n` +
        `5. Notify the requestor upon completion`;
    } else if (detected && !resourceName) {
      nextAction = `The request mentions a ${validatorInfo?.label || detected.type} but no specific name/value was provided.\n\n` +
        `Steps:\n` +
        `1. Ask the requestor to provide the intended resource name/value\n` +
        `2. Re-run AI validation once the name is provided\n` +
        `3. Ensure the name complies with all platform rules before provisioning`;
    } else if (isUrgent) {
      nextAction = geminiResult?.ai_next_action || `URGENT: Escalate to supervisor for immediate review. Target resolution within ${priority === 'high' ? '24 hours' : '72 hours'}.`;
    } else {
      nextAction = geminiResult?.ai_next_action || `Schedule for next review cycle. Assign based on request type (${request_type || 'general'}). Follow standard SLA timeline.`;
    }

    // ── 6. Tags ──
    const suggestedTags = [];
    if (lowerDesc.includes('access') || lowerDesc.includes('permission') || lowerDesc.includes('login')) suggestedTags.push('Access');
    if (isUrgent) suggestedTags.push('Urgent');
    if (lowerDesc.includes('depend') || lowerDesc.includes('block') || lowerDesc.includes('wait')) suggestedTags.push('Dependency');
    if (lowerDesc.includes('follow') || lowerDesc.includes('update') || lowerDesc.includes('check')) suggestedTags.push('Follow-up');
    if (lowerDesc.includes('security') || lowerDesc.includes('vulnerab') || lowerDesc.includes('patch')) suggestedTags.push('Security');
    if (detected) suggestedTags.push('Infrastructure');
    if (lowerDesc.includes('server') || lowerDesc.includes('infra') || lowerDesc.includes('deploy')) { if (!suggestedTags.includes('Infrastructure')) suggestedTags.push('Infrastructure'); }
    if (lowerDesc.includes('software') || lowerDesc.includes('app') || lowerDesc.includes('install')) suggestedTags.push('Software');
    if (lowerDesc.includes('network') || lowerDesc.includes('vpn') || lowerDesc.includes('wifi') || lowerDesc.includes('dns') || lowerDesc.includes('domain')) suggestedTags.push('Network');
    if (hasValidationIssues || isOutOfScopeAfterAI) suggestedTags.push('Follow-up');
    if (suggestedTags.length === 0) suggestedTags.push('Follow-up');

    // ── 7. Build validation response ──
    let validation = undefined;
    if (isOutOfScopeAfterAI) {
      validation = {
        valid: false,
        validation_type: 'scope',
        scope_category: scopeResult.category,
        scope_suggestion: scopeResult.suggestion,
        violations: [`This request belongs to "${scopeResult.category}" — outside the scope of this IT ticketing tool.`],
      };
    } else if (detected && validatorInfo) {
      validation = {
        valid: !hasValidationIssues,
        validation_type: 'resource',
        resource_type: resourceType,
        resource_label: validatorInfo.label,
        resource_name: resourceName,
        violations: validationResult ? validationResult.violations : [],
        requirements: validationResult ? validationResult.requirements : [],
        suggested_name: validationResult?.suggested,
        rules_reference: validatorInfo.rules,
        name_provided: !!resourceName,
      };
    }

    res.json({
      ai_summary: summary,
      ai_details: details,
      ai_next_action: nextAction,
      suggested_tags: suggestedTags,
      validation,
      ai_powered: !!geminiResult,
      spelling_corrections: spellingCorrections,
      corrected_description: correctedDescription,
      follow_up_questions: followUpQuestions,
      needs_more_info: needsMoreInfo,
    });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

export default router;
