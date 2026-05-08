package kz.finmentor.repository;

import kz.finmentor.model.IncomeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IncomeRecordRepository extends JpaRepository<IncomeRecord, Long> {
    List<IncomeRecord> findByUserIdOrderByIncomeDateDesc(Long userId);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM IncomeRecord r WHERE r.user.id = :userId")
    double sumAmountByUserId(Long userId);

    @Query("SELECT COALESCE(SUM(r.totalTax), 0) FROM IncomeRecord r WHERE r.user.id = :userId")
    double sumTaxByUserId(Long userId);
}
