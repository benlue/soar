CREATE TABLE Person
(
    psnID   bigint not null auto_increment,
    name    varchar(64),
    addr    varchar(128),
    primary key (psnID)
)
engine = InnoDB;
