<?php

/**
 * CalicoUploader : File uploader for Calico MumbleBot
 * 
 * PHP version 5.5.9
 * 
 * @category But I'm Not A Wrapper
 * @package  CalicoUploader
 * @author   Colin "Oka" Hall-Coates
 * @version  0.1
 * @license  MIT License
 * @link     http://github.com/Oka-/calico
 */

require_once('bin/conf.php');

class CalicoUploader {
  private $db;
  private $info;
  private $ufile;
  
  private $errors;
  private $status;
  
  /*
   * Creates a self escalating uploader object
   */
  
  public function __construct () {
    $this->errors = array();
    $this->status = false;
    
    $passwordStatus = $this->grantAccess();
    
    if ($passwordStatus) {
      $infoStatus = $this->verifyInfo();
    }
    
    if ($infoStatus) {
      $dbConnected = $this->connectDB();
    }
   
    if ($dbConnected) {
      $fileStatus = $this->checkFile(); 
      $dbStatus = $this->checkDB();
    }
    
    if ($fileStatus && $dbStatus) {
      $this->status = $this->commit();
    }
  }
  
  /*
   * @return array of errors
   */
  public function getErrors () {
    return $this->errors;
  }
  
  /*
   * @return status boolean
   * true if commit worked, false otherwise
   */
  
  public function getStatus () {
    return $this->status;
  }
  
  /*
   * Compare password string to access password
   * @return true if match
   * @return false if no match
   */
  private function grantAccess () {
    global $UPLOADER_ACCESS;
    $pw = $_POST['upload']['pw'];
    
    if ($pw === $UPLOADER_ACCESS) {
      return true;
    } else {
      $this->errors['password_error'] = 'Incorrect password.';
      return false;
    }
  }
  
  /*
   * Check post info for required fields
   */
  private function verifyInfo () {
    $fields = $_POST['upload'];
    
    if (!isset($fields['name']) ||
        !isset($fields['cmd']) ||
        !isset($fields['dir'])
    ) {
      $this->errors['info_error'] = 'Primary field not present.';
      return false;
      }
      
    $this->info = array();
    $this->info['name'] = null;
    $this->info['cmd'] = null;
    $this->info['dir'] = null;
    
    $errMet = false;
    
    foreach ($fields as $k => $v) {
      if (array_key_exists($k, $this->info)) {
        $v = trim($v);
        $v = preg_replace('/\s+/', ' ', $v);
        if (!empty($v)) {
          $this->info[$k] = $v;
        } else {
          $this->errors['info_error'] = 'Missing '.$k.' field';
          return false;
        }
      }
    }
    
    return true;
  }
  
  /*
   * Connect to database
   * @return false if error, true otherwise
   */
  
  private function connectDB () {
    global $DB_NAME, $DB_USER, $DB_PASS;
    
    try {
      $this->db = new PDO($DB_NAME, $DB_USER, $DB_PASS);
    } catch (PDOException $e) {
      $this->errors['database_error'] = $e->getMessage();
      $this->db = null;
      return false;
    }
    
    return true;
  }
  
  /*
   * Check uploaded file
   * @return false if non-audio file
   * @return false if filename in directory
   * @return true otherwise
   */
  
  private function checkFile () {
    global $UPLOAD_ROOT;
    
    $this->ufile = $_FILES['fileUpload'];
    
    if (!preg_match('/^audio\//', $this->ufile['type'])) {
      $this->errors['file_error'] = 'Not an audio file.';
      return false;
    }
    
    if (file_exists($UPLOAD_ROOT.'/'.$this->info['dir'].'/'. $this->ufile['name'])) {
      $this->errors['file_error'] = 'File name already exists in directory.';
      return false;
    }
    
    return true;
  }
  
  /*
   * Check database for existing command
   * @return false if command exists, true otherwise
   */
  
  private function checkDB () {
    global $DB_SOUND_TABLE;
    
    $cmd = strtolower($this->info['cmd']);
    $query = 'SELECT id FROM sound_bites WHERE cmd = :cmd';
    
    $request = $this->db->prepare($query);
    $request->execute(array(':cmd' => $cmd));
    
    $response = $request->fetchAll();
    
    if (count($response) > 0) {
      $this->errors['database_error'] = 'Command already exists in the database.';
      return false;
    }
    
    return true;
  }
  
  /*
   * If file is correct, and DB does not contain the same command
   * Upload the file, and insert into the DB
   * @return false if upload fails
   * @return false if database insertion fails
   * @return true otherwise
   */
  private function commit () {
    $uploaded = $this->uploadFile();
    
    if ($uploaded) {
      $inserted = $this->insertDB($uploaded);
    } else {
      $this->errors['file_error'] = 'Could not upload file.';
      return false;
    }
    
    if ($inserted) {
      return true;
    } else {
      $this->errors['database_error'] = 'Could not insert into database.';
      return false;
    }
  }
  
  /*
   * Upload file to disk
   * @return false if unable to create directory
   * @return false if unable to move temp file
   * @return false if temp file not found
   * @return new file path otherwise
   */
  
  private function uploadFile() {
    global $UPLOAD_ROOT;
    
    $tmp = $this->ufile['tmp_name'];
    $root = $UPLOAD_ROOT;
    $dir = $this->info['dir'];
    $name = $this->ufile['name'];
    
    $fpath = "$root/$dir/$name";
    
    if (is_uploaded_file($tmp)) {
      if (!is_dir("$root/$dir")) {
        if (!mkdir("$root/$dir")) {
          $this->errors['directory_error'] = 'Could not create directory.';
          return false;
        }
      }
      
      if (!move_uploaded_file($tmp, $fpath)) {
        $this->errors['file_error'] = 'Could not move uploaded file.';
        return false;
      }
      
      return $fpath;
    } else {
      $this->errors['file_error'] = 'Temporary uploaded file not found.';
      return false;
    }
  }
  
  /*
   * Insert appropriate info into the database
   * Assumes success if object has escalated to this point
   * @return false if cannot get file name or extension for whatever reason
   * @return true otherise
   */
  
  private function insertDB($fpath) {
    $name = $this->info['name'];
    $dir = $this->info['dir'];
    $cmd = $this->info['cmd'];
    
    $filename = pathinfo($fpath, PATHINFO_FILENAME);
    $ext = pathinfo($fpath, PATHINFO_EXTENSION);
    
    if (!$filename || !$ext) {
      return false;
    }
    
    $query = 'INSERT INTO sound_bites(name, cmd, dir, filename, ext) value(:name, :cmd, :dir, :filename, :ext)';
    $request = $this->db->prepare($query);
    $request->execute(array(':name' => $name, ':cmd' => $cmd, ':dir' => $dir, ':filename' => $filename, ':ext' => $ext));
      
    return true;
    
  }
}

?>