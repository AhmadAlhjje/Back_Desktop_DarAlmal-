-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: mizan
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admins` (
  `id_admin` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `username` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN','MANAGER','ACCOUNTANT','EMPLOYEE','VIEWER') NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `is_developer` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_admin`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'مدير النظام','admin',NULL,'admin@example.com','$2b$12$LGbLI1aYJM0JS0G8VHPW9empoyXuqJQNO6j4rjNvF6LcYRZUjbgc6','ADMIN','[\"admin.manage\",\"currency.manage\",\"client.create\",\"client.update\",\"movement.create\",\"movement.view\",\"movement.cancel\",\"movement.reverse\",\"journal.view\"]',0,1,'2026-09-02 12:30:19','2026-09-02 12:30:19');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_groups`
--

DROP TABLE IF EXISTS `client_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `client_groups` (
  `id_group` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_group`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_groups`
--

LOCK TABLES `client_groups` WRITE;
/*!40000 ALTER TABLE `client_groups` DISABLE KEYS */;
INSERT INTO `client_groups` VALUES (1,'مغتربون سوريون','عملاء مقيمون خارج سوريا',1,'2026-09-02 13:02:23'),(2,'شركات ومؤسسات','الشركات التجارية والمؤسسات',1,'2026-09-02 13:02:23'),(3,'عملاء VIP','عملاء ذوو حجم تعاملات كبير',1,'2026-09-02 13:02:23'),(4,'عملاء عاديون',NULL,1,'2026-09-02 13:02:23'),(5,'عملاء VIP','مجموعة العملاءاا المميزين',1,'2026-09-02 13:06:10');
/*!40000 ALTER TABLE `client_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clients` (
  `id_client` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `client_code` varchar(50) NOT NULL,
  `group_id` bigint(20) unsigned DEFAULT NULL,
  `full_name` varchar(200) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_client`),
  UNIQUE KEY `client_code` (`client_code`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `client_groups` (`id_group`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'C001',1,'أحمد محمد السعيد','0991234567',NULL,'إسطنبول - تركيا','مغترب منذ 2019',1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(2,'C002',1,'فاطمة خالد العمر','0997654321','fatima@mail.com','برلين - ألمانيا',NULL,1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(3,'C003',1,'محمود يوسف الحسين','0993456789',NULL,'دبي - الإمارات','عميل منتظم',1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(4,'C004',1,'سارة وليد الكردي',NULL,'sara.k@gmail.com','ستوكهولم - السويد',NULL,1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(5,'C005',2,'شركة النور للتجارة','0112345678','alnoor@trade.sy','دمشق - الميدان','تجارة المواد الغذائية',1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(6,'C006',2,'مؤسسة الأمانة للاستيراد','0213456789',NULL,'حلب - السكري',NULL,1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(7,'C007',3,'خالد عبدالرحمن الزهراني','0501234567','khalid@hotmail.com','جدة - السعودية','تحويلات شهرية منتظمة',1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(8,'C008',3,'نورا سعيد المنصور','0559876543',NULL,'الرياض - السعودية',NULL,1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(9,'C009',3,'عمر فيصل الحربي','0542345678','omar.h@gmail.com','الرياض - السعودية','VIP منذ 2022',1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(10,'C010',4,'سمر أحمد الدريس','0991122334',NULL,'دمشق - المزة',NULL,1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(11,'C011',4,'بشير محمد القاسم','0993344556',NULL,'اللاذقية',NULL,1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(12,'C012',4,'رامي وليد الجابر','0994455667','rami.j@yahoo.com','حمص - وادي الذهب',NULL,1,'2026-09-02 13:02:23','2026-09-02 13:02:23'),(13,'11',2,'عدنان','09766','adnanhlwngi@gmail.com','syria-idlib','ال',1,'2026-09-02 13:03:54','2026-09-02 13:03:54');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currencies`
--

DROP TABLE IF EXISTS `currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `currencies` (
  `id_currency` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `currency_name` varchar(100) NOT NULL,
  `currency_code` varchar(10) NOT NULL,
  `currency_symbol` varchar(20) DEFAULT NULL,
  `decimal_places` tinyint(3) unsigned NOT NULL DEFAULT 2,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_currency`),
  UNIQUE KEY `currency_code` (`currency_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currencies`
--

LOCK TABLES `currencies` WRITE;
/*!40000 ALTER TABLE `currencies` DISABLE KEYS */;
INSERT INTO `currencies` VALUES (1,'US Dollar','USD','',2,1,'2026-09-02 12:10:33'),(2,'Syrian Pound','SYP','ل.س',2,1,'2026-09-02 12:10:33'),(3,'Euro','EUR','€',2,0,'2026-09-02 12:10:33'),(4,'Turkish Lira','TRY','₺',2,1,'2026-09-02 12:10:33'),(5,'Saudi Riyal','SAR','ر.س',2,1,'2026-09-02 12:10:33');
/*!40000 ALTER TABLE `currencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchange_details`
--

DROP TABLE IF EXISTS `exchange_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_details` (
  `id_exchange` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `movement_id` bigint(20) unsigned NOT NULL,
  `client_id` bigint(20) unsigned NOT NULL,
  `from_currency_id` bigint(20) unsigned NOT NULL,
  `from_amount` decimal(20,4) NOT NULL,
  `to_currency_id` bigint(20) unsigned NOT NULL,
  `to_amount` decimal(20,4) NOT NULL,
  `exchange_rate` decimal(20,8) NOT NULL,
  `total_us` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `total_them` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `profit_loss` decimal(20,4) NOT NULL DEFAULT 0.0000,
  PRIMARY KEY (`id_exchange`),
  UNIQUE KEY `movement_id` (`movement_id`),
  KEY `client_id` (`client_id`),
  KEY `from_currency_id` (`from_currency_id`),
  KEY `to_currency_id` (`to_currency_id`),
  CONSTRAINT `exchange_details_ibfk_1` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id_movement`) ON UPDATE CASCADE,
  CONSTRAINT `exchange_details_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id_client`) ON UPDATE CASCADE,
  CONSTRAINT `exchange_details_ibfk_3` FOREIGN KEY (`from_currency_id`) REFERENCES `currencies` (`id_currency`) ON UPDATE CASCADE,
  CONSTRAINT `exchange_details_ibfk_4` FOREIGN KEY (`to_currency_id`) REFERENCES `currencies` (`id_currency`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchange_details`
--

LOCK TABLES `exchange_details` WRITE;
/*!40000 ALTER TABLE `exchange_details` DISABLE KEYS */;
INSERT INTO `exchange_details` VALUES (1,14,12,1,200.0000,2,2700000.0000,13500.00000000,200.0000,2700000.0000,3.0000),(2,15,7,5,1500.0000,1,400.0000,3.75000000,1500.0000,400.0000,2.5000),(3,16,10,4,3250.0000,1,100.0000,32.50000000,3250.0000,100.0000,1.8000);
/*!40000 ALTER TABLE `exchange_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_entries`
--

DROP TABLE IF EXISTS `journal_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal_entries` (
  `id_day` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `movement_id` bigint(20) unsigned NOT NULL,
  `line_no` int(10) unsigned NOT NULL,
  `client_id` bigint(20) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(20,4) NOT NULL,
  `entry_side` enum('US','THEM') NOT NULL,
  `exchange_rate` decimal(20,8) DEFAULT NULL,
  `fees` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `fee_percentage` decimal(10,4) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `movement_date` date NOT NULL,
  `movement_time` time NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_day`),
  UNIQUE KEY `uq_journal_movement_line` (`movement_id`,`line_no`),
  KEY `journal_entries_client_id` (`client_id`),
  KEY `journal_entries_currency_id` (`currency_id`),
  KEY `idx_journal_client_currency_date` (`client_id`,`currency_id`,`movement_date`),
  KEY `idx_journal_date_movement` (`movement_date`,`movement_id`),
  CONSTRAINT `journal_entries_ibfk_1` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id_movement`) ON UPDATE CASCADE,
  CONSTRAINT `journal_entries_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id_client`) ON UPDATE CASCADE,
  CONSTRAINT `journal_entries_ibfk_3` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id_currency`) ON UPDATE CASCADE,
  CONSTRAINT `chk_journal_entries_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_entries`
--

LOCK TABLES `journal_entries` WRITE;
/*!40000 ALTER TABLE `journal_entries` DISABLE KEYS */;
INSERT INTO `journal_entries` VALUES (1,1,1,1,1,505.0000,'US',1.00000000,5.0000,NULL,'استلام من أحمد السعيد - إسطنبول','2026-08-20','09:15:00','2026-09-02 13:02:24'),(2,1,2,10,2,6756497.0000,'THEM',13513.00000000,3.0000,NULL,'تسليم لسمر الدريس - دمشق','2026-08-20','09:15:00','2026-09-02 13:02:24'),(3,2,1,2,3,810.0000,'US',1.07520000,10.0000,NULL,'استلام من فاطمة - برلين','2026-08-21','11:30:00','2026-09-02 13:02:24'),(4,2,2,5,1,810.0000,'THEM',1.00000000,5.0000,NULL,'تسليم لشركة النور','2026-08-21','11:30:00','2026-09-02 13:02:24'),(5,3,1,7,5,2015.0000,'US',0.26667000,15.0000,NULL,'استلام من خالد الزهراني','2026-08-22','14:00:00','2026-09-02 13:02:24'),(6,3,2,3,5,2005.0000,'THEM',0.26667000,5.0000,NULL,'تسليم لمحمود الحسين - دبي','2026-08-22','14:00:00','2026-09-02 13:02:24'),(7,4,1,12,1,303.0000,'US',1.00000000,3.0000,NULL,'استلام من رامي الجابر','2026-08-25','10:45:00','2026-09-02 13:02:24'),(8,4,2,11,2,4052700.0000,'THEM',13500.00000000,2.0000,NULL,'تسليم لبشير القاسم - اللاذقية','2026-08-25','10:45:00','2026-09-02 13:02:24'),(9,5,1,8,1,412.0000,'US',1.00000000,12.0000,NULL,'استلام من نورا المنصور','2026-08-28','16:20:00','2026-09-02 13:02:24'),(10,5,2,4,3,366.5400,'THEM',0.93000000,6.0000,NULL,'تسليم لسارة الكردي - ستوكهولم','2026-08-28','16:20:00','2026-09-02 13:02:24'),(11,6,1,9,1,1020.0000,'US',1.00000000,20.0000,NULL,'استلام من عمر الحربي','2026-09-01','08:30:00','2026-09-02 13:02:24'),(12,6,2,6,2,13567500.0000,'THEM',13500.00000000,5.0000,NULL,'تسليم لمؤسسة الأمانة - حلب','2026-09-01','08:30:00','2026-09-02 13:02:24'),(13,7,1,1,1,200.0000,'US',NULL,0.0000,NULL,'قبض نقدي من أحمد السعيد','2026-08-18','09:00:00','2026-09-02 13:02:24'),(14,8,1,10,2,5000000.0000,'US',NULL,0.0000,NULL,'قبض ليرات سورية من سمر الدريس','2026-08-19','11:00:00','2026-09-02 13:02:24'),(15,9,1,7,5,750.0000,'US',NULL,0.0000,NULL,'قبض ريال سعودي من خالد الزهراني','2026-08-26','13:30:00','2026-09-02 13:02:24'),(16,10,1,2,3,500.0000,'US',NULL,0.0000,NULL,'قبض يورو من فاطمة العمر','2026-09-02','10:15:00','2026-09-02 13:02:24'),(17,11,1,11,1,150.0000,'THEM',NULL,0.0000,NULL,'دفع نقدي لبشير القاسم','2026-08-20','15:00:00','2026-09-02 13:02:24'),(18,12,1,5,2,3200000.0000,'THEM',NULL,0.0000,NULL,'دفع ليرات لشركة النور للتجارة','2026-08-24','12:00:00','2026-09-02 13:02:24'),(19,13,1,3,1,600.0000,'THEM',NULL,0.0000,NULL,'دفع دولار لمحمود الحسين - دبي','2026-09-01','14:45:00','2026-09-02 13:02:24'),(20,14,1,12,1,200.0000,'US',13500.00000000,0.0000,NULL,'بيع دولار - رامي','2026-08-23','10:00:00','2026-09-02 13:02:24'),(21,14,2,12,2,2700000.0000,'THEM',13500.00000000,0.0000,NULL,'شراء ليرة - رامي','2026-08-23','10:00:00','2026-09-02 13:02:24'),(22,15,1,7,5,1500.0000,'US',3.75000000,0.0000,NULL,'بيع ريال - خالد','2026-08-27','11:30:00','2026-09-02 13:02:24'),(23,15,2,7,1,400.0000,'THEM',3.75000000,0.0000,NULL,'شراء دولار - خالد','2026-08-27','11:30:00','2026-09-02 13:02:24'),(24,16,1,10,4,3250.0000,'US',32.50000000,0.0000,NULL,'بيع ليرة تركية - سمر','2026-09-02','09:00:00','2026-09-02 13:02:24'),(25,16,2,10,1,100.0000,'THEM',32.50000000,0.0000,NULL,'شراء دولار - سمر','2026-09-02','09:00:00','2026-09-02 13:02:24'),(26,17,1,1,1,100.0000,'US',NULL,0.0000,NULL,'تسوية لصالح أحمد السعيد','2026-08-31','17:00:00','2026-09-02 13:02:24'),(27,17,2,10,1,100.0000,'THEM',NULL,0.0000,NULL,'تسوية على سمر الدريس','2026-08-31','17:00:00','2026-09-02 13:02:24'),(28,18,1,5,1,250.0000,'US',NULL,0.0000,NULL,'رصيد مستحق لشركة النور','2026-09-01','16:00:00','2026-09-02 13:02:24'),(29,18,2,6,1,250.0000,'THEM',NULL,0.0000,NULL,'مطلوب من مؤسسة الأمانة','2026-09-01','16:00:00','2026-09-02 13:02:24');
/*!40000 ALTER TABLE `journal_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movement_types`
--

DROP TABLE IF EXISTS `movement_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movement_types` (
  `id_movement_type` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `movement_code` varchar(50) NOT NULL,
  `movement_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_movement_type`),
  UNIQUE KEY `movement_code` (`movement_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movement_types`
--

LOCK TABLES `movement_types` WRITE;
/*!40000 ALTER TABLE `movement_types` DISABLE KEYS */;
INSERT INTO `movement_types` VALUES (1,'TRANSFER','وتحويل','عملية تحويل بين عملاء',1),(2,'SETTLEMENT','حركة تسوية',NULL,1),(3,'MULTI','حركة متعددة',NULL,1),(4,'RECEIPT','سند قبض',NULL,1),(5,'PAYMENT','سند دفع',NULL,1),(6,'EXCHANGE','تصريف',NULL,1);
/*!40000 ALTER TABLE `movement_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movements`
--

DROP TABLE IF EXISTS `movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movements` (
  `id_movement` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `movement_no` bigint(20) unsigned NOT NULL,
  `movement_type_id` bigint(20) unsigned NOT NULL,
  `client_id` bigint(20) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `movement_date` date NOT NULL,
  `movement_time` time NOT NULL,
  `total_result` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `status` enum('DRAFT','POSTED','CANCELLED','REVERSED') NOT NULL DEFAULT 'POSTED',
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_movement`),
  UNIQUE KEY `movement_no` (`movement_no`),
  KEY `updated_by` (`updated_by`),
  KEY `movements_movement_date` (`movement_date`),
  KEY `movements_movement_type_id` (`movement_type_id`),
  KEY `movements_client_id` (`client_id`),
  KEY `movements_created_by` (`created_by`),
  KEY `movements_status` (`status`),
  CONSTRAINT `movements_ibfk_1` FOREIGN KEY (`movement_type_id`) REFERENCES `movement_types` (`id_movement_type`) ON UPDATE CASCADE,
  CONSTRAINT `movements_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id_client`) ON UPDATE CASCADE,
  CONSTRAINT `movements_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id_admin`) ON UPDATE CASCADE,
  CONSTRAINT `movements_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id_admin`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movements`
--

LOCK TABLES `movements` WRITE;
/*!40000 ALTER TABLE `movements` DISABLE KEYS */;
INSERT INTO `movements` VALUES (1,1001,1,1,'تحويل لعائلة السعيد - دمشق','2026-08-20','09:15:00',8.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(2,1002,1,2,'تحويل تجاري - برلين إلى دمشق','2026-08-21','11:30:00',15.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(3,1003,1,7,'تحويل جدة - دبي','2026-08-22','14:00:00',20.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(4,1004,1,12,'تحويل شخصي - حمص إلى اللاذقية','2026-08-25','10:45:00',5.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(5,1005,1,8,'تحويل دولي - الرياض إلى ستوكهولم','2026-08-28','16:20:00',18.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(6,1006,1,9,'تحويل تجاري - الرياض إلى حلب','2026-09-01','08:30:00',25.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(7,1007,4,1,'قبض نقدي - أحمد السعيد','2026-08-18','09:00:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(8,1008,4,10,'قبض ليرات سورية - سمر','2026-08-19','11:00:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(9,1009,4,7,'قبض ريال سعودي - خالد','2026-08-26','13:30:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(10,1010,4,2,'قبض يورو - فاطمة برلين','2026-09-02','10:15:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(11,1011,5,11,'دفع نقدي - بشير القاسم','2026-08-20','15:00:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(12,1012,5,5,'دفع ليرات - شركة النور','2026-08-24','12:00:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(13,1013,5,3,'دفع دولار - محمود دبي','2026-09-01','14:45:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(14,1014,6,12,'تصريف دولار - ليرة سورية','2026-08-23','10:00:00',3.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(15,1015,6,7,'تصريف ريال - دولار','2026-08-27','11:30:00',2.5000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(16,1016,6,10,'تصريف ليرة تركية - دولار','2026-09-02','09:00:00',1.8000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(17,1017,2,1,'تسوية حساب أغسطس','2026-08-31','17:00:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24'),(18,1018,2,5,'تسوية شهرية - شركة النور','2026-09-01','16:00:00',0.0000,'POSTED',1,'2026-09-02 13:02:24',NULL,'2026-09-02 13:02:24');
/*!40000 ALTER TABLE `movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id_notification` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` bigint(20) unsigned NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `notification_type` varchar(50) DEFAULT NULL,
  `movement_id` bigint(20) unsigned DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_notification`),
  KEY `admin_id` (`admin_id`),
  KEY `movement_id` (`movement_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id_admin`) ON UPDATE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id_movement`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'تحويل جديد #1001','تم إنشاء حوالة بقيمة 500 دولار من أحمد السعيد إلى سمر الدريس بنجاح.','MOVEMENT',1,1,'2026-08-20 06:15:00'),(2,1,'تحويل جديد #1002','تم إنشاء حوالة بقيمة 800 يورو من فاطمة العمر - برلين إلى شركة النور للتجارة.','MOVEMENT',2,1,'2026-08-21 08:30:00'),(3,1,'تحويل جديد #1003','تم إنشاء حوالة بقيمة 2,000 ريال من خالد الزهراني إلى محمود الحسين - دبي.','MOVEMENT',3,1,'2026-08-22 11:00:00'),(4,1,'تصريف #1014','عملية تصريف دولار بليرة سورية للعميل رامي الجابر — 200 دولار بسعر 13,500.','MOVEMENT',14,1,'2026-08-23 07:05:00'),(5,1,'تحويل جديد #1005','تحويل دولي — 400 دولار من نورا المنصور (الرياض) إلى سارة الكردي (ستوكهولم).','MOVEMENT',5,1,'2026-08-28 13:20:00'),(6,1,'تحويل جديد #1006','تم إنشاء حوالة بقيمة 1,000 دولار من عمر الحربي (الرياض) إلى مؤسسة الأمانة (حلب).','MOVEMENT',6,0,'2026-09-01 05:30:00'),(7,1,'سند قبض #1010','تم تسجيل قبض 500 يورو من فاطمة العمر.','MOVEMENT',10,1,'2026-09-02 07:15:00'),(8,1,'تصريف #1016','تصريف 3,250 ليرة تركية بـ 100 دولار للعميل سمر الدريس.','MOVEMENT',16,0,'2026-09-02 06:00:00'),(9,1,'تنبيه: تسوية حساب أغسطس','تم إغلاق تسوية شهر أغسطس بين أحمد السعيد وسمر الدريس. الرجاء مراجعة الأرصدة.','ALERT',17,1,'2026-08-31 14:00:00'),(10,1,'تنبيه: تسوية شركة النور','تمت تسوية الحساب الشهري مع شركة النور للتجارة ومؤسسة الأمانة. المبلغ: 250 دولار.','ALERT',18,0,'2026-09-01 13:00:00'),(11,1,'مرحباً بك في ميزان','تم تسجيل دخولك بنجاح. آخر دخول كان من نفس الجهاز.','SYSTEM',NULL,1,'2026-08-18 05:00:00'),(12,1,'إشعار: سعر الصرف','تذكير: سعر الدولار مقابل الليرة السورية يتراوح اليوم بين 13,450 و13,520. يرجى تحديث أسعار الصرف.','INFO',NULL,1,'2026-08-30 04:30:00'),(13,1,'نهاية الشهر: مراجعة الأرصدة','اقترب نهاية شهر أغسطس. يُنصح بمراجعة أرصدة العملاء والتحقق من التسويات المعلقة.','INFO',NULL,0,'2026-08-31 05:00:00'),(14,1,'عميل جديد: سارة الكردي','تم تسجيل العميلة سارة وليد الكردي (C004) في مجموعة المغتربين السوريين.','INFO',NULL,1,'2026-09-02 08:00:00');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receipt_payment_details`
--

DROP TABLE IF EXISTS `receipt_payment_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `receipt_payment_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `movement_id` bigint(20) unsigned NOT NULL,
  `transaction_type` enum('RECEIPT','PAYMENT') NOT NULL,
  `statement` text DEFAULT NULL,
  `client_id` bigint(20) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(20,4) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `movement_id` (`movement_id`),
  KEY `client_id` (`client_id`),
  KEY `currency_id` (`currency_id`),
  CONSTRAINT `receipt_payment_details_ibfk_1` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id_movement`) ON UPDATE CASCADE,
  CONSTRAINT `receipt_payment_details_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id_client`) ON UPDATE CASCADE,
  CONSTRAINT `receipt_payment_details_ibfk_3` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id_currency`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipt_payment_details`
--

LOCK TABLES `receipt_payment_details` WRITE;
/*!40000 ALTER TABLE `receipt_payment_details` DISABLE KEYS */;
INSERT INTO `receipt_payment_details` VALUES (1,7,'RECEIPT','قبض نقدي',1,1,200.0000),(2,8,'RECEIPT','قبض نقدي بالليرة',10,2,5000000.0000),(3,9,'RECEIPT',NULL,7,5,750.0000),(4,10,'RECEIPT','قبض يورو',2,3,500.0000),(5,11,'PAYMENT','دفع نقدي',11,1,150.0000),(6,12,'PAYMENT',NULL,5,2,3200000.0000),(7,13,'PAYMENT','دفع دولار',3,1,600.0000);
/*!40000 ALTER TABLE `receipt_payment_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequelizedata`
--

DROP TABLE IF EXISTS `sequelizedata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sequelizedata` (
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequelizedata`
--

LOCK TABLES `sequelizedata` WRITE;
/*!40000 ALTER TABLE `sequelizedata` DISABLE KEYS */;
INSERT INTO `sequelizedata` VALUES ('20260902000100-master-data.cjs'),('20260902000200-initial-admin.cjs'),('20260902000300-demo-data.cjs'),('20260902000400-demo-notifications.cjs');
/*!40000 ALTER TABLE `sequelizedata` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequelizemeta`
--

DROP TABLE IF EXISTS `sequelizemeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sequelizemeta` (
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequelizemeta`
--

LOCK TABLES `sequelizemeta` WRITE;
/*!40000 ALTER TABLE `sequelizemeta` DISABLE KEYS */;
INSERT INTO `sequelizemeta` VALUES ('20260902000100-create-financial-schema.cjs');
/*!40000 ALTER TABLE `sequelizemeta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transfer_details`
--

DROP TABLE IF EXISTS `transfer_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transfer_details` (
  `id_transfer` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `movement_id` bigint(20) unsigned NOT NULL,
  `statement` text DEFAULT NULL,
  `transfer_amount` decimal(20,4) NOT NULL,
  `transfer_currency_id` bigint(20) unsigned NOT NULL,
  `from_client_id` bigint(20) unsigned NOT NULL,
  `from_currency_id` bigint(20) unsigned NOT NULL,
  `from_exchange_rate` decimal(20,8) NOT NULL,
  `fee_us` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `fee_us_percentage` decimal(10,4) DEFAULT NULL,
  `total_us` decimal(20,4) NOT NULL,
  `description_us` text DEFAULT NULL,
  `to_client_id` bigint(20) unsigned NOT NULL,
  `to_currency_id` bigint(20) unsigned NOT NULL,
  `to_exchange_rate` decimal(20,8) NOT NULL,
  `fee_them` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `fee_them_percentage` decimal(10,4) DEFAULT NULL,
  `total_them` decimal(20,4) NOT NULL,
  `description_them` text DEFAULT NULL,
  PRIMARY KEY (`id_transfer`),
  UNIQUE KEY `movement_id` (`movement_id`),
  KEY `transfer_currency_id` (`transfer_currency_id`),
  KEY `from_currency_id` (`from_currency_id`),
  KEY `to_currency_id` (`to_currency_id`),
  KEY `transfer_details_from_client_id` (`from_client_id`),
  KEY `transfer_details_to_client_id` (`to_client_id`),
  CONSTRAINT `transfer_details_ibfk_1` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id_movement`) ON UPDATE CASCADE,
  CONSTRAINT `transfer_details_ibfk_2` FOREIGN KEY (`transfer_currency_id`) REFERENCES `currencies` (`id_currency`) ON UPDATE CASCADE,
  CONSTRAINT `transfer_details_ibfk_3` FOREIGN KEY (`from_client_id`) REFERENCES `clients` (`id_client`) ON UPDATE CASCADE,
  CONSTRAINT `transfer_details_ibfk_4` FOREIGN KEY (`from_currency_id`) REFERENCES `currencies` (`id_currency`) ON UPDATE CASCADE,
  CONSTRAINT `transfer_details_ibfk_5` FOREIGN KEY (`to_client_id`) REFERENCES `clients` (`id_client`) ON UPDATE CASCADE,
  CONSTRAINT `transfer_details_ibfk_6` FOREIGN KEY (`to_currency_id`) REFERENCES `currencies` (`id_currency`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transfer_details`
--

LOCK TABLES `transfer_details` WRITE;
/*!40000 ALTER TABLE `transfer_details` DISABLE KEYS */;
INSERT INTO `transfer_details` VALUES (1,1,'1',500.0000,1,1,1,1.00000000,5.0000,NULL,505.0000,NULL,10,2,1.00000000,3.0000,NULL,6756497.0000,NULL),(2,2,'2',800.0000,3,2,3,1.07520000,10.0000,NULL,810.0000,'رسوم إرسال',5,1,1.00000000,5.0000,NULL,810.0000,NULL),(3,3,'7',2000.0000,5,7,5,0.26667000,15.0000,NULL,2015.0000,NULL,3,5,0.26667000,5.0000,NULL,2005.0000,NULL),(4,4,'12',300.0000,1,12,1,1.00000000,3.0000,NULL,303.0000,NULL,11,2,1.00000000,2.0000,NULL,4052700.0000,NULL),(5,5,'8',400.0000,1,8,1,1.00000000,12.0000,NULL,412.0000,NULL,4,3,0.93000000,6.0000,NULL,366.5400,NULL),(6,6,'9',1000.0000,1,9,1,1.00000000,20.0000,NULL,1020.0000,'رسوم إرسال',6,2,1.00000000,5.0000,NULL,13567500.0000,NULL);
/*!40000 ALTER TABLE `transfer_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'mizan'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-02 22:53:34
